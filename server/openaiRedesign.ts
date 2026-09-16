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

export const DEFAULT_IMAGE_MODEL = 'gpt-image-1.5'
export const FALLBACK_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-2']

function pickSize(aspect?: number): string {
  if (!aspect || Number.isNaN(aspect)) return '1024x1024'
  if (aspect > 1.25) return '1536x1024'
  if (aspect < 0.8) return '1024x1536'
  return '1024x1024'
}

function briefInstructions(userBrief: string): string {
  const text = userBrief.toLowerCase()
  const parts: string[] = []
  const wantsWalls = /wall|paint|painted/.test(text)
  const wantsFloor = /floor|hardwood|oak|walnut|marble|tile|carpet|concrete/.test(text)
  const wantsFurniture = /furniture|sofa|couch|chair|bed|table|replace the furniture|change (the |my )?furniture/.test(
    text,
  )
  const orange = /orange|terracotta|rust|burnt/.test(text)

  if (wantsWalls && orange) {
    parts.push(
      'WALLS: Repaint the painted wall surfaces a saturated orange / terracotta (clearly orange, eggshell sheen). Keep white/cream trim, crown molding, ceiling, window frames, and the outdoor view unchanged. Shadows and corners must still look like real paint, not a global color grade or Instagram filter.',
    )
  } else if (wantsWalls) {
    parts.push(
      'WALLS: Repaint the painted wall surfaces to the requested color with real paint sheen and correct edges. Do not tint the whole photograph.',
    )
  }

  if (wantsFloor) {
    parts.push(
      'FLOOR: Replace the floor material to match the brief (new hardwood, tile, marble, etc.) with correct perspective, planks/grout, and baseboards. Do not only shift the existing floor hue.',
    )
  }

  if (wantsFurniture) {
    parts.push(
      'FURNITURE: Remove the existing furniture and place new pieces that fit this room, with realistic scale, contact shadows, and lighting that matches the window.',
    )
  }

  if (parts.length === 0) {
    parts.push(`Apply this brief as a real renovation of the photographed room: ${userBrief.trim()}`)
  }

  return parts.join(' ')
}

export function buildRedesignPrompt(userBrief: string, intent: string, seed?: number): string {
  const brief = userBrief.trim()
  const nonce = seed != null ? `Variation ${seed}.` : ''
  const changes = briefInstructions(brief)

  const constraints =
    'This is an image-to-image PHOTO EDIT of the uploaded room. Preserve camera angle, lens, crop, room geometry, windows, window views, doors, ceiling, trim, and daylight direction. Output a real photograph of THIS room after renovation. No illustration, no CGI overlay, no cartoon furniture, no text, no watermark, no people, no filter/LUT over the whole frame.'

  if (intent === 'refine') {
    return [
      constraints,
      'The input is already a redesign. Keep the same design direction and push it further — do not revert to the original pre-renovation furniture or finishes.',
      changes,
      `Homeowner brief: ${brief}`,
      nonce,
    ].join(' ')
  }

  if (intent === 'alternate') {
    return [
      constraints,
      'Produce a DISTINCT second renovation of the same brief: different furniture pieces if furniture is requested, a different but still-correct wall-paint interpretation, different floor product if flooring is requested. Still a photograph of this same room.',
      changes,
      `Homeowner brief: ${brief}`,
      nonce,
    ].join(' ')
  }

  return [
    constraints,
    'Execute the brief as a contractor would, not as a colorist. If the brief mentions orange walls, the walls must obviously be orange paint.',
    changes,
    `Homeowner brief: ${brief}`,
    nonce,
  ].join(' ')
}

function dataUrlToFile(imageDataUrl: string): File {
  const comma = imageDataUrl.indexOf(',')
  if (comma < 0) throw new Error('Invalid image data URL.')
  const header = imageDataUrl.slice(0, comma)
  const b64 = imageDataUrl.slice(comma + 1)
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const bytes = Buffer.from(b64, 'base64')
  return new File([new Uint8Array(bytes)], `room.${ext}`, { type: mime })
}

function supportsInputFidelity(model: string): boolean {
  if (model.includes('mini')) return false
  return model.startsWith('gpt-image-')
}

export function friendlyOpenAIError(status: number, message: string): string {
  const m = message.toLowerCase()
  if (status === 401) return 'OpenAI rejected the API key. Check OPENAI_API_KEY in .env (then restart npm run dev).'
  if (status === 429) return 'OpenAI rate limit or quota hit. Check billing at platform.openai.com.'
  if (m.includes('verify') || m.includes('organization') || (m.includes('not allowed') && m.includes('image'))) {
    return 'This OpenAI organization may need GPT Image verification: https://platform.openai.com/settings/organization/general'
  }
  if (status === 400 && m.includes('safety')) {
    return 'OpenAI blocked this image or prompt. Try a different room photo or a simpler brief.'
  }
  return message || `OpenAI image edit failed (${status}).`
}

function isUnknownModelError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('invalid model') ||
    m.includes('does not exist') ||
    m.includes('unknown model') ||
    m.includes('not found') ||
    (m.includes('invalid value') && m.includes('model'))
  )
}

function isRetryableParamError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('unknown parameter') ||
    m.includes('unsupported') ||
    m.includes('invalid value') ||
    m.includes('input_fidelity') ||
    m.includes('output_format') ||
    m.includes('output_compression') ||
    m.includes('quality')
  )
}

type EditOptions = {
  quality: string
  size: string
  outputFormat: 'jpeg' | 'png'
  inputFidelity: boolean
}

async function postEdit(
  apiKey: string,
  model: string,
  req: RedesignRequest,
  opts: EditOptions,
): Promise<RedesignSuccess> {
  const file = dataUrlToFile(req.imageDataUrl)
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', buildRedesignPrompt(req.prompt, req.intent || 'initial', req.seed))
  form.append('image', file, file.name)
  form.append('size', opts.size)
  form.append('quality', opts.quality)
  form.append('output_format', opts.outputFormat)
  if (opts.outputFormat === 'jpeg') form.append('output_compression', '90')
  if (opts.inputFidelity && supportsInputFidelity(model)) {
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
    const error = new Error(friendlyOpenAIError(response.status, message)) as Error & {
      unknownModel?: boolean
      retryableParam?: boolean
      rawMessage?: string
    }
    error.unknownModel = isUnknownModelError(message)
    error.retryableParam = isRetryableParamError(message)
    error.rawMessage = message
    throw error
  }

  const json = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> }
  const piece = json.data?.[0]
  const mime = opts.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
  if (piece?.b64_json) {
    return { dataUrl: `data:${mime};base64,${piece.b64_json}`, model }
  }
  if (piece?.url) {
    const imgRes = await fetch(piece.url)
    const buf = Buffer.from(await imgRes.arrayBuffer())
    return { dataUrl: `data:${mime};base64,${buf.toString('base64')}`, model }
  }
  throw new Error('OpenAI returned no image data.')
}

async function postEditWithRetries(
  apiKey: string,
  model: string,
  quality: string,
  req: RedesignRequest,
): Promise<RedesignSuccess> {
  const size = pickSize(req.aspect)
  const attempts: EditOptions[] = [
    { quality, size, outputFormat: 'jpeg', inputFidelity: true },
    { quality, size, outputFormat: 'jpeg', inputFidelity: false },
    { quality: 'auto', size, outputFormat: 'jpeg', inputFidelity: true },
    { quality, size, outputFormat: 'png', inputFidelity: true },
  ]

  let lastError: Error | null = null
  const seen = new Set<string>()
  for (const opts of attempts) {
    const key = JSON.stringify(opts)
    if (seen.has(key)) continue
    seen.add(key)
    try {
      return await postEdit(apiKey, model, req, opts)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const extra = lastError as Error & { unknownModel?: boolean; retryableParam?: boolean }
      if (extra.unknownModel) throw lastError
      if (!extra.retryableParam) throw lastError
    }
  }
  throw lastError ?? new Error('OpenAI image edit failed.')
}

export async function editRoomPhoto(config: RedesignConfig, req: RedesignRequest): Promise<RedesignSuccess> {
  if (!req.imageDataUrl || !req.prompt?.trim()) {
    throw new Error('imageDataUrl and prompt are required.')
  }

  const tried = new Set<string>()
  const queue = [config.model, ...FALLBACK_MODELS].filter((m) => {
    if (!m || tried.has(m)) return false
    tried.add(m)
    return true
  })

  let lastError: Error | null = null
  for (const model of queue) {
    try {
      return await postEditWithRetries(config.apiKey, model, config.quality, req)
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
    model: env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
    quality: env.OPENAI_IMAGE_QUALITY?.trim() || 'high',
  }
}
