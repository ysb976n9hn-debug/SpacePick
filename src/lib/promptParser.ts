import type { DesignStyle, FloorStyle, ParsedBrief, RoomKind } from '../types'

const COLOR_ALIASES: Array<{ keys: string[]; hex: string; name: string }> = [
  { keys: ['terracotta', 'burnt orange'], hex: '#c65d3b', name: 'terracotta' },
  { keys: ['orange', 'tangerine'], hex: '#e07a3d', name: 'orange' },
  { keys: ['coral'], hex: '#e07060', name: 'coral' },
  { keys: ['blush', 'dusty rose'], hex: '#e8b4b8', name: 'blush' },
  { keys: ['pink'], hex: '#d48aa8', name: 'pink' },
  { keys: ['red', 'crimson'], hex: '#b33a3a', name: 'red' },
  { keys: ['burgundy', 'wine'], hex: '#7a2e3a', name: 'burgundy' },
  { keys: ['navy'], hex: '#2c3e6b', name: 'navy' },
  { keys: ['blue'], hex: '#4a6fa5', name: 'blue' },
  { keys: ['teal'], hex: '#3d7a7a', name: 'teal' },
  { keys: ['sage'], hex: '#8a9a7b', name: 'sage' },
  { keys: ['olive'], hex: '#6b7a3d', name: 'olive' },
  { keys: ['green', 'emerald'], hex: '#5c7a5a', name: 'green' },
  { keys: ['mint'], hex: '#9ec9b3', name: 'mint' },
  { keys: ['yellow', 'mustard'], hex: '#e6c35c', name: 'yellow' },
  { keys: ['gold'], hex: '#c9a227', name: 'gold' },
  { keys: ['cream', 'ivory', 'off-white'], hex: '#efe6d5', name: 'cream' },
  { keys: ['white'], hex: '#f4f1ea', name: 'white' },
  { keys: ['charcoal'], hex: '#3d3a38', name: 'charcoal' },
  { keys: ['black'], hex: '#2a2a2a', name: 'black' },
  { keys: ['gray', 'grey'], hex: '#8b8580', name: 'gray' },
  { keys: ['brown', 'chocolate'], hex: '#6b4a32', name: 'brown' },
  { keys: ['walnut'], hex: '#5c3a21', name: 'walnut' },
  { keys: ['oak'], hex: '#c4a574', name: 'oak' },
  { keys: ['purple', 'lilac', 'lavender'], hex: '#6b5b95', name: 'purple' },
  { keys: ['beige', 'sand', 'taupe'], hex: '#d8c3a5', name: 'beige' },
]

const STYLE_KEYS: Array<{ keys: string[]; style: DesignStyle }> = [
  { keys: ['scandi', 'scandinavian', 'nordic'], style: 'scandinavian' },
  { keys: ['mid-century', 'midcentury', 'mcm'], style: 'midcentury' },
  { keys: ['industrial', 'loft'], style: 'industrial' },
  { keys: ['boho', 'bohemian'], style: 'boho' },
  { keys: ['japandi', 'wabi'], style: 'japandi' },
  { keys: ['coastal', 'beach', 'hamptons'], style: 'coastal' },
  { keys: ['traditional', 'classic'], style: 'traditional' },
  { keys: ['minimal', 'minimalist'], style: 'minimalist' },
  { keys: ['maximal', 'maximalist', 'eclectic'], style: 'maximalist' },
  { keys: ['modern', 'contemporary'], style: 'modern' },
]

const FLOOR_KEYS: Array<{ keys: string[]; style: FloorStyle; color: string }> = [
  { keys: ['herringbone', 'parquet', 'hardwood', 'wood floor', 'wooden'], style: 'wood', color: '#b08968' },
  { keys: ['oak floor', 'oak flooring'], style: 'wood', color: '#c4a574' },
  { keys: ['walnut floor'], style: 'wood', color: '#5c3a21' },
  { keys: ['marble'], style: 'marble', color: '#d9d4cc' },
  { keys: ['tile', 'tiles', 'porcelain'], style: 'tile', color: '#cfc7bb' },
  { keys: ['concrete', 'cement'], style: 'concrete', color: '#9a9590' },
  { keys: ['carpet', 'rug only'], style: 'carpet', color: '#8a6a4a' },
]

const ROOM_KEYS: Array<{ keys: string[]; room: RoomKind }> = [
  { keys: ['bedroom', 'bed room'], room: 'bedroom' },
  { keys: ['kitchen'], room: 'kitchen' },
  { keys: ['office', 'study', 'desk'], room: 'office' },
  { keys: ['dining'], room: 'dining' },
  { keys: ['living', 'lounge', 'family room'], room: 'living' },
]

const STYLE_DEFAULTS: Record<DesignStyle, { wall: string; wallName: string; accent: string; floor: string; warmth: number; sat: number }> =
  {
    modern: { wall: '#e8e2d9', wallName: 'warm white', accent: '#2c3e6b', floor: '#b08968', warmth: 0.08, sat: 0.06 },
    scandinavian: { wall: '#f4f1ea', wallName: 'gallery white', accent: '#8a9a7b', floor: '#d4b896', warmth: 0.12, sat: -0.04 },
    midcentury: { wall: '#efe0c8', wallName: 'buttercream', accent: '#c65d3b', floor: '#6b4a32', warmth: 0.22, sat: 0.12 },
    industrial: { wall: '#c8c2ba', wallName: 'warehouse grey', accent: '#3d3a38', floor: '#9a9590', warmth: -0.06, sat: -0.08 },
    boho: { wall: '#ead7c1', wallName: 'clay plaster', accent: '#c65d3b', floor: '#b08968', warmth: 0.28, sat: 0.18 },
    japandi: { wall: '#ebe4d8', wallName: 'rice paper', accent: '#6b4a32', floor: '#c4a574', warmth: 0.1, sat: -0.06 },
    coastal: { wall: '#eef3f4', wallName: 'sea mist', accent: '#4a6fa5', floor: '#d8c3a5', warmth: 0.04, sat: 0.04 },
    traditional: { wall: '#e6d5b8', wallName: 'parchment', accent: '#6b4a32', floor: '#5c3a21', warmth: 0.16, sat: 0.04 },
    minimalist: { wall: '#f3f1ec', wallName: 'gallery white', accent: '#8b8580', floor: '#d4c4b0', warmth: 0.02, sat: -0.1 },
    maximalist: { wall: '#d4c4e0', wallName: 'lilac wash', accent: '#c65d3b', floor: '#6b4a32', warmth: 0.14, sat: 0.22 },
  }

function includesAny(text: string, keys: string[]): boolean {
  return keys.some((k) => text.includes(k))
}

function findColor(text: string): { hex: string; name: string } | null {
  for (const entry of COLOR_ALIASES) {
    if (includesAny(text, entry.keys)) return { hex: entry.hex, name: entry.name }
  }
  return null
}

export function parseBrief(prompt: string): ParsedBrief {
  const text = prompt.toLowerCase()
  const keywords: string[] = []

  let style: DesignStyle = 'modern'
  for (const entry of STYLE_KEYS) {
    if (includesAny(text, entry.keys)) {
      style = entry.style
      keywords.push(entry.style)
      break
    }
  }

  let room: RoomKind = 'generic'
  for (const entry of ROOM_KEYS) {
    if (includesAny(text, entry.keys)) {
      room = entry.room
      break
    }
  }

  let floorStyle: FloorStyle = 'keep'
  let floorColor = STYLE_DEFAULTS[style].floor
  for (const entry of FLOOR_KEYS) {
    if (includesAny(text, entry.keys)) {
      floorStyle = entry.style
      floorColor = entry.color
      keywords.push(entry.style)
      break
    }
  }
  if (text.includes('floor') && floorStyle === 'keep') {
    floorStyle = 'wood'
    keywords.push('flooring')
  }

  const defaults = STYLE_DEFAULTS[style]
  let wallColor = defaults.wall
  let wallName = defaults.wallName
  const accentColor = defaults.accent

  const wallMention = text.match(/walls?\s+(?:a\s+)?(?:nice\s+)?([a-z\- ]{3,18})/)
  const paintMention = text.match(/paint(?:ed)?(?:\s+the\s+walls?)?\s+(?:a\s+)?([a-z\- ]{3,18})/)
  const colorSource = `${wallMention?.[1] ?? ''} ${paintMention?.[1] ?? ''} ${text}`
  const parsedColor = findColor(colorSource)
  if (parsedColor) {
    wallColor = parsedColor.hex
    wallName = parsedColor.name
    keywords.push(parsedColor.name)
  }

  const furniture = text.includes('furniture') || text.includes('sofa') || text.includes('couch') || text.includes('bed')
  if (furniture) keywords.push('furniture')

  return {
    wallColor,
    wallName,
    accentColor,
    floorStyle,
    floorColor,
    style,
    room,
    warmth: defaults.warmth,
    saturation: defaults.sat,
    keywords,
  }
}

export function recipeLine(brief: ParsedBrief): string {
  const bits = [`${brief.wallName} walls`]
  if (brief.floorStyle !== 'keep') bits.push(`${brief.floorStyle} floors`)
  bits.push(`${brief.style} furniture`)
  return bits.join(' · ')
}

export function lookLabel(prompt: string, intent: string): string {
  const brief = parseBrief(prompt)
  const vibe =
    brief.wallName === 'orange' || brief.wallName === 'terracotta'
      ? 'Terracotta crush'
      : brief.style === 'scandinavian'
        ? 'Quiet Scandi'
        : brief.style === 'industrial'
          ? 'Loft mood'
          : brief.style === 'boho'
            ? 'Sunbaked boho'
            : brief.style === 'japandi'
              ? 'Japandi hush'
              : brief.style === 'coastal'
                ? 'Sea-air coastal'
                : brief.style === 'minimalist'
                  ? 'Soft minimal'
                  : brief.style === 'maximalist'
                    ? 'Maximalist mix'
                    : brief.style === 'midcentury'
                      ? 'Mid-century glow'
                      : 'New look'
  if (intent === 'refine') return `${vibe} · refined`
  if (intent === 'alternate') return `${vibe} · another take`
  return vibe
}

export const PROMPT_CHIPS = [
  'Paint the walls orange, swap the flooring, and change the furniture.',
  'Scandinavian refresh — pale oak floors, cream walls, low linen sofa.',
  'Moody industrial loft with concrete floors and charcoal walls.',
  'Cozy bedroom: sage walls, walnut furniture, warm lamps.',
  'Japandi living room — plaster walls, low oak pieces, fewer things.',
]
