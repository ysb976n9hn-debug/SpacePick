import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { editRoomPhoto, readRedesignEnv } from './server/openaiRedesign'

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
          message: 'No OPENAI_API_KEY configured. Add it to .env and restart npm run dev.',
        })
        return
      }
      try {
        const parsed = JSON.parse(await readBody(req)) as {
          imageDataUrl?: string
          prompt?: string
          intent?: string
          aspect?: number
          seed?: number
        }
        if (!parsed.imageDataUrl || !parsed.prompt?.trim()) {
          sendJson(res, 400, { error: 'BAD_REQUEST', message: 'imageDataUrl and prompt are required.' })
          return
        }
        const result = await editRoomPhoto(
          { apiKey: options.apiKey, model: options.model, quality: options.quality },
          {
            imageDataUrl: parsed.imageDataUrl,
            prompt: parsed.prompt,
            intent: parsed.intent || 'initial',
            aspect: parsed.aspect,
            seed: parsed.seed,
          },
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

export function redesignApiPlugin(options: RedesignPluginOptions = readRedesignEnv()): Plugin {
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
