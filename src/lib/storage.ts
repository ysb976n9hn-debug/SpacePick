import type { CreditsState, SavedLook } from '../types'

const KEY = 'spacepick:v1'
const DEFAULT_CREDITS = 8

type PersistShape = {
  prompt: string
  credits: CreditsState
  saved: SavedLook[]
}

export function loadPersisted(): PersistShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return { prompt: '', credits: { remaining: DEFAULT_CREDITS, plan: 'free' }, saved: [] }
    }
    const parsed = JSON.parse(raw) as Partial<PersistShape>
    return {
      prompt: parsed.prompt ?? '',
      credits: parsed.credits ?? { remaining: DEFAULT_CREDITS, plan: 'free' },
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    }
  } catch {
    return { prompt: '', credits: { remaining: DEFAULT_CREDITS, plan: 'free' }, saved: [] }
  }
}

export function savePersisted(data: PersistShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded (large data URLs) — keep working from memory.
    try {
      const slim = { ...data, saved: data.saved.slice(0, 4) }
      localStorage.setItem(KEY, JSON.stringify(slim))
    } catch {
      /* ignore */
    }
  }
}
