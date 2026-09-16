import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

export type RedesignPluginOptions = {
  apiKey: string | undefined
  model: string
  quality: string
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function readBody(req: IncomingMessage, maxBytes = 12 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Image payload is too large (max 12MB).'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function pickSize(aspect?: number): string {
  if (!aspect || Number.isNaN(aspect)) return '1024x1024'
  if (aspect > 1.2) return '1536x1024'
  if (aspect < 0.8) return '1024x1536'
  return '1024x1024'
}

function buildPrompt(userBrief: string, intent: string): string {
  const direction =
    intent === 'refine'
      ? 'Refine and enhance this already-redesigned room in the SAME design direction. Keep the palette, materials, and furniture family. Make it more polished, livable, and magazine-complete.'
      : intent === 'alternate'
        ? 'Create a DISTINCTLY DIFFERENT interior design take on this same room and brief. Keep architecture, camera angle, windows, and layout. Change furniture arrangement, material interpretation, and styling so it feels like another designer\'s proposal.'
        : 'Redesign this exact room photo to match the request. Keep the same camera angle, architecture, windows, ceiling, and spatial layout.'

  return [
    'You are a high-end interior photographer and designer.',
    direction,
    `Homeowner brief: ${userBrief.trim()}`,
    'Photorealistic interior photography, natural light, physically plausible materials.',
    'Do not add people, animals, text, logos, watermarks, or UI chrome.',
    'Preserve the room\'s bones — this should still be recognizably the same space.',
  ].join(' ')
}

async function editWithOpenAI(
  apiKey: string,
  model: string,
  quality: string,
  imageDataUrl: string,
  prompt: string,
  intent: string,
  aspect?: number,
): Promise<{ dataUrl: string; model: string }> {
  const comma = imageDataUrl.indexOf(',')
  if (comma < 0) throw new Error('Invalid image data URL.')
  const header = imageDataUrl.slice(0, comma)
  const b64 = imageDataUrl.slice(comma + 1)
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png'
  const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png'
  const bytes = Buffer.from(b64, 'base64')

  const form = new FormData()
  form.append('model', model)
  form.append('prompt', buildPrompt(prompt, intent))
  form.append('image', new Blob([new Uint8Array(bytes)], { type: mime }), `room.${ext}`)
  form.append('quality', quality)
  form.append('size', pickSize(aspect))
  // GPT Image models always return b64_json — do not send response_format.

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  const raw = await response.text()
  if (!response.ok) {
    let message = `OpenAI image edit failed (${response.status}).`
    try {
      const err = JSON.parse(raw) as { error?: { message?: string } }
      if (err.error?.message) message = err.error.message
    } catch {
      if (raw) message = raw.slice(0, 400)
    }
    throw new Error(message)
  }

  const json = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> }
  const piece = json.data?.[0]
  if (piece?.b64_json) {
    return { dataUrl: `data:image/png;base64,${piece.b64_json}`, model }
  }
  if (piece?.url) {
    const imgRes = await fetch(piece.url)
    const buf = Buffer.from(await imgRes.arrayBuffer())
    return { dataUrl: `data:image/png;base64,${buf.toString('base64')}`, model }
  }
  throw new Error('OpenAI returned no image data.')
}

function attachRoutes(middlewares: Connect.Server, options: RedesignPluginOptions) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url === '/api/mode' && req.method === 'GET') {
      sendJson(res, 200, {
        mode: options.apiKey ? 'live' : 'demo',
        model: options.apiKey ? options.model : null,
      })
      return
    }
    if (url === '/api/redesign' && req.method === 'POST') {
      if (!options.apiKey) {
        sendJson(res, 503, {
          error: 'NO_API_KEY',
          message: 'No OPENAI_API_KEY configured. Use demo mode.',
        })
        return
      }
      try {
        const parsed = JSON.parse(await readBody(req)) as {
          imageDataUrl?: string
          prompt?: string
          intent?: string
          aspect?: number
        }
        if (!parsed.imageDataUrl || !parsed.prompt?.trim()) {
          sendJson(res, 400, { error: 'BAD_REQUEST', message: 'imageDataUrl and prompt are required.' })
          return
        }
        const result = await editWithOpenAI(
          options.apiKey,
          options.model,
          options.quality,
          parsed.imageDataUrl,
          parsed.prompt,
          parsed.intent || 'initial',
          parsed.aspect,
        )
        sendJson(res, 200, { image: result.dataUrl, model: result.model, mode: 'live' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed.'
        sendJson(res, 500, { error: 'GENERATION_FAILED', message })
      }
      return
    }
    next()
  })
}

export function redesignApiPlugin(options: RedesignPluginOptions): Plugin {
  return {
    name: 'spacepick-redesign-api',
    configureServer(server) {
      attachRoutes(server.middlewares, options)
    },
    configurePreviewServer(server) {
      attachRoutes(server.middlewares, options)
    },
  }
}
