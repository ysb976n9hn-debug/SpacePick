export type GenerateIntent = 'initial' | 'refine' | 'alternate'

export type RedesignRequest = {
  imageDataUrl: string
  prompt: string
  intent?: GenerateIntent | string
  aspect?: number
  seed?: number
}

export type RedesignConfig = {
  apiKey: string
  model: string
  quality: string
}

export type RedesignSuccess = {
  dataUrl: string
  model: string
}

function pickSize(aspect?: number): string {
  if (!aspect || Number.isNaN(aspect)) return '1024x1024'
  if (aspect > 1.25) return '1536x1024'
  if (aspect < 0.8) return '1024x1536'
  return '1024x1024'
}

export function buildRedesignPrompt(userBrief: string, intent: string, seed?: number): string {
  const brief = userBrief.trim()
  const nonce = seed != null ? `Variation nonce ${seed}.` : ''

  if (intent === 'refine') {
    return [
      'Photoreal interior PHOTO EDIT of the uploaded image.',
      'This photo is already a redesign of a real room. Keep going in the SAME design direction.',
      'Preserve camera angle, architecture, windows, ceiling, and room proportions exactly.',
      'Do not revert furniture or finishes back to the original pre-renovation room.',
      'Polish materials, lighting, styling, and completeness so it looks like a finished magazine photograph of the same renovation.',
      `Homeowner brief (still apply): ${brief}`,
      nonce,
      'Output a real photograph: physically plausible materials, correct perspective, natural light. No illustration, CGI overlay, text, logos, watermarks, or people.',
    ].join(' ')
  }

  if (intent === 'alternate') {
    return [
      'Photoreal interior PHOTO EDIT of the uploaded room photograph.',
      'Keep the SAME camera, architecture, windows, doors, ceiling, and spatial layout.',
      'Produce a DISTINCTLY DIFFERENT designer take on the brief: different furniture pieces and arrangement, different flooring product, and a different but still-correct wall color/finish interpretation.',
      `You MUST actually replace: (1) wall paint/finish, (2) flooring, (3) furniture — whenever the brief asks for those. Do not only grade the colors.`,
      `Homeowner brief: ${brief}`,
      nonce,
      'The result must look like a real photo of this same room after a different renovation contractor finished the job. No illustration, filters, text, logos, watermarks, or people.',
    ].join(' ')
  }

  return [
    'Photoreal interior PHOTO EDIT of the uploaded room photograph — not a new scene, not a color filter.',
    'HARD CONSTRAINTS — preserve exactly: camera angle, lens/viewpoint, crop, room geometry, windows, window views, doors, ceiling, trim, and daylight direction.',
    'APPLY the homeowner brief as a real renovation of THIS room:',
    `- If they mention walls/paint: repaint the wall surfaces the requested color with real paint sheen and correct corners/edges.`,
    `- If they mention flooring: replace the floor material (new hardwood, tile, etc.) with correct perspective, grout/planks, and baseboards.`,
    `- If they mention furniture: REMOVE the existing furniture and place new pieces that fit the room, with realistic scale, contact shadows, and matching lighting.`,
    'Finish the room (rug, lighting, art) only as needed so it looks lived-in and complete.',
    `Homeowner brief: ${brief}`,
    nonce,
    'Output must be a believable photograph of the renovated room. No cartoon, no overlay graphics, no CGI furniture pasted on, no text, no watermark, no people.',
  ].join(' ')
}

function dataUrlToBlob(imageDataUrl: string): { blob: Blob; filename: string } {
  const comma = imageDataUrl.indexOf(',')
  if (comma < 0) throw new Error('Invalid image data URL.')
  const header = imageDataUrl.slice(0, comma)
  const b64 = imageDataUrl.slice(comma + 1)
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const bytes = Buffer.from(b64, 'base64')
  return { blob: new Blob([new Uint8Array(bytes)], { type: mime }), filename: `room.${ext}` }
}

function usesInputFidelity(model: string): boolean {
  return model.startsWith('gpt-image-1') && !model.includes('gpt-image-2')
}

function isUnknownModelError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('invalid value') ||
    m.includes('invalid model') ||
    m.includes('does not exist') ||
    m.includes('unknown model') ||
    m.includes('not found') ||
    (m.includes('model') && m.includes('invalid'))
  )
}

export function friendlyOpenAIError(status: number, message: string): string {
  const m = message.toLowerCase()
  if (status === 401) return 'OpenAI rejected the API key. Check OPENAI_API_KEY.'
  if (status === 429) return 'OpenAI rate limit or quota hit. Wait a moment or check billing at platform.openai.com.'
  if (m.includes('verify') || m.includes('organization') || m.includes('not allowed')) {
    return 'This OpenAI organization may need image-generation verification: https://platform.openai.com/settings/organization/general'
  }
  if (status === 400 && m.includes('safety')) {
    return 'OpenAI blocked this image or prompt. Try a different room photo or a simpler brief.'
  }
  return message || `OpenAI image edit failed (${status}).`
}

async function postEdit(
  apiKey: string,
  model: string,
  quality: string,
  req: RedesignRequest,
): Promise<RedesignSuccess> {
  const { blob, filename } = dataUrlToBlob(req.imageDataUrl)
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', buildRedesignPrompt(req.prompt, req.intent || 'initial', req.seed))
  form.append('image', blob, filename)
  form.append('quality', quality)
  form.append('size', pickSize(req.aspect))
  form.append('output_format', 'png')
  if (usesInputFidelity(model)) {
    form.append('input_fidelity', 'high')
  }

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
    const error = new Error(friendlyOpenAIError(response.status, message))
    ;(error as Error & { unknownModel?: boolean }).unknownModel = isUnknownModelError(message)
    throw error
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

const FALLBACK_MODELS = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1']

export async function editRoomPhoto(config: RedesignConfig, req: RedesignRequest): Promise<RedesignSuccess> {
  if (!req.imageDataUrl || !req.prompt?.trim()) {
    throw new Error('imageDataUrl and prompt are required.')
  }

  const tried = new Set<string>()
  const queue = [config.model, ...FALLBACK_MODELS].filter((m) => {
    if (tried.has(m)) return false
    tried.add(m)
    return true
  })

  let lastError: Error | null = null
  for (const model of queue) {
    try {
      return await postEdit(config.apiKey, model, config.quality, req)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const unknown = Boolean((lastError as Error & { unknownModel?: boolean }).unknownModel)
      if (!unknown) throw lastError
    }
  }
  throw lastError ?? new Error('OpenAI image edit failed.')
}

export function readRedesignEnv(env: Record<string, string | undefined> = process.env): {
  apiKey: string | undefined
  model: string
  quality: string
} {
  return {
    apiKey: env.OPENAI_API_KEY?.trim() || undefined,
    model: env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2',
    quality: env.OPENAI_IMAGE_QUALITY?.trim() || 'high',
  }
}
