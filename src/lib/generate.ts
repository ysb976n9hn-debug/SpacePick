import { generateDemoDesign } from './demoGenerator'
import { parseBrief, recipeLine, lookLabel } from './promptParser'
import type { GenerateIntent, GenerationMode } from '../types'

export type GenerateRequest = {
  baselineDataUrl: string
  prompt: string
  intent: GenerateIntent
  seed: number
  refineLevel: number
  preferredMode: GenerationMode
}

export type GenerateResult = {
  dataUrl: string
  label: string
  recipe: string
  mode: GenerationMode
  fallbackReason?: string
}

export async function fetchServerMode(): Promise<{ mode: GenerationMode; model: string | null }> {
  try {
    const res = await fetch('/api/mode')
    if (!res.ok) return { mode: 'demo', model: null }
    const json = (await res.json()) as { mode?: string; model?: string | null }
    return {
      mode: json.mode === 'live' ? 'live' : 'demo',
      model: json.model ?? null,
    }
  } catch {
    return { mode: 'demo', model: null }
  }
}

async function generateLive(req: GenerateRequest): Promise<GenerateResult> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Could not read the room photo.'))
    el.src = req.baselineDataUrl
  })

  const res = await fetch('/api/redesign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl: req.baselineDataUrl,
      prompt: req.prompt,
      intent: req.intent,
      aspect: img.naturalWidth / img.naturalHeight,
      seed: req.seed,
    }),
  })

  let json: { image?: string; message?: string; model?: string } = {}
  try {
    json = (await res.json()) as { image?: string; message?: string; model?: string }
  } catch {
    json = {}
  }

  if (!res.ok || !json.image) {
    throw new Error(json.message || 'Live generation failed. Check the API key, org verification, and billing.')
  }

  const brief = parseBrief(req.prompt)
  return {
    dataUrl: json.image,
    label: lookLabel(req.prompt, req.intent),
    recipe: recipeLine(brief),
    mode: 'live',
  }
}

export async function generateLook(req: GenerateRequest): Promise<GenerateResult> {
  if (req.preferredMode === 'live') {
    try {
      return await generateLive(req)
    } catch (error) {
      const demo = await generateDemoDesign(req)
      return {
        ...demo,
        mode: 'demo',
        fallbackReason: error instanceof Error ? error.message : 'Live generation failed.',
      }
    }
  }
  const demo = await generateDemoDesign(req)
  return { ...demo, mode: 'demo' }
}

export async function loadSampleRoom(): Promise<string> {
  const url = `${import.meta.env.BASE_URL}sample-room.jpg`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not load the sample room photo.')
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the sample room photo.'))
    reader.readAsDataURL(blob)
  })
}
