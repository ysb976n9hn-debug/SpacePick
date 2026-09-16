export type Screen = 'upload' | 'prompt' | 'swipe' | 'gallery'
export type GenerationMode = 'demo' | 'live'
export type GenerateIntent = 'initial' | 'refine' | 'alternate'
export type SwipeDirection = 'like' | 'pass'

export type FloorStyle = 'wood' | 'marble' | 'tile' | 'concrete' | 'carpet' | 'keep'
export type RoomKind = 'living' | 'bedroom' | 'kitchen' | 'office' | 'dining' | 'generic'
export type DesignStyle =
  | 'modern'
  | 'scandinavian'
  | 'midcentury'
  | 'industrial'
  | 'boho'
  | 'japandi'
  | 'coastal'
  | 'traditional'
  | 'minimalist'
  | 'maximalist'

export type ParsedBrief = {
  wallColor: string
  wallName: string
  accentColor: string
  floorStyle: FloorStyle
  floorColor: string
  style: DesignStyle
  room: RoomKind
  warmth: number
  saturation: number
  keywords: string[]
}

export type Design = {
  id: string
  image: string
  prompt: string
  seed: number
  intent: GenerateIntent
  refineLevel: number
  label: string
  recipe: string
  mode: GenerationMode
  createdAt: number
}

export type SavedLook = Design & {
  original: string
  // Extension point: affiliate / "Shop this look" payload can hang off a saved look later.
  shopLookId?: string
}

export type SwipeEvent = {
  id: string
  direction: SwipeDirection
  designId: string
  at: number
}

export type CreditsState = {
  remaining: number
  // v1 is a stub — never blocks generation. Swap in real entitlements later.
  plan: 'free' | 'pro'
}
