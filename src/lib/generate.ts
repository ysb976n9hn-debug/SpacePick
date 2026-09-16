import { generateDemoDesign } from './demoGenerator'
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

export async function fetchServerMode(): Promise<GenerationMode> {
  try {
    const res = await fetch('/api/mode')
    if (!res.ok) return 'demo'
    const json = (await res.json()) as { mode?: string }
    return json.mode === 'live' ? 'live' : 'demo'
  } catch {
    return 'demo'
  }
}

async function generateLive(req: GenerateRequest): Promise<GenerateResult> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Could not read baseline image.'))
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
    }),
  })
  const json = (await res.json()) as { image?: string; message?: string }
  if (!res.ok || !json.image) {
    throw new Error(json.message || 'Live generation failed.')
  }
  return {
    dataUrl: json.image,
    label: req.intent === 'refine' ? 'Live refine' : req.intent === 'alternate' ? 'Live alternate' : 'Live redesign',
    recipe: req.prompt.trim(),
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
  const started = Date.now()
  const demo = await generateDemoDesign(req)
  const wait = 700 - (Date.now() - started)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  return { ...demo, mode: 'demo' }
}
