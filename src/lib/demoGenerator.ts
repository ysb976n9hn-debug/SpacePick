import { hexToRgb, loadImage, mixHex } from './imageUtils'
import { parseBrief, recipeLine } from './promptParser'
import { mulberry32 } from './rng'
import type { GenerateIntent, ParsedBrief } from '../types'

type RGB = { r: number; g: number; b: number }

function parseCssColor(color: string): RGB {
  if (color.startsWith('#')) return hexToRgb(color)
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
  return hexToRgb('#c65d3b')
}

function css(c: RGB, a = 1) {
  return a < 1 ? `rgba(${c.r|0},${c.g|0},${c.b|0},${a})` : `rgb(${c.r|0},${c.g|0},${c.b|0})`
}

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function shade(c: RGB, f: number): RGB {
  if (f >= 1) return mixRgb(c, { r: 255, g: 255, b: 255 }, f - 1)
  return mixRgb(c, { r: 18, g: 10, b: 8 }, 1 - f)
}

function stampDemoBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = Math.max(10, Math.round(w * 0.018))
  const label = 'DEMO — not real AI'
  ctx.save()
  ctx.font = `700 ${Math.max(13, Math.round(w * 0.028))}px Outfit, system-ui, sans-serif`
  const tw = ctx.measureText(label).width
  const bh = Math.max(28, Math.round(h * 0.046))
  const bw = tw + pad * 2
  const x = pad
  const y = h - bh - pad
  ctx.fillStyle = 'rgba(16, 8, 6, 0.9)'
  ctx.beginPath()
  ctx.roundRect(x, y, bw, bh, bh / 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 210, 122, 0.85)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#FFD27A'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + pad, y + bh / 2)
  ctx.restore()
}

function paintWalls(ctx: CanvasRenderingContext2D, w: number, h: number, wall: RGB, horizon: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const targetY = Math.max(1, luma(wall.r, wall.g, wall.b))
  for (let y = 0; y < horizon + 8; y++) {
    const ceilingFade = y < h * 0.16 ? 0.12 : 1
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const Y = luma(r, g, b)
      const greenish = g > r + 14 && g > b + 6
      const windowish = Y > 216 || (x < w * 0.36 && greenish && Y > 88)
      if (windowish || Y < 42 || Y > 242) continue
      const t = amount * ceilingFade * (Y > 150 ? 0.78 : 0.48)
      const scale = Y / targetY
      d[i] = Math.max(0, Math.min(255, r * (1 - t) + wall.r * scale * t))
      d[i + 1] = Math.max(0, Math.min(255, g * (1 - t) + wall.g * scale * t))
      d[i + 2] = Math.max(0, Math.min(255, b * (1 - t) + wall.b * scale * t))
    }
  }
  ctx.putImageData(img, 0, 0)
}

function drawFloorSurface(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  brief: ParsedBrief,
  floor: RGB,
  rand: () => number,
  amount: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, horizon + 10)
  ctx.lineTo(w, horizon - 4)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.clip()
  ctx.globalAlpha = amount
  const grad = ctx.createLinearGradient(0, horizon, 0, h)
  grad.addColorStop(0, css(shade(floor, 1.18)))
  grad.addColorStop(1, css(shade(floor, 0.72)))
  ctx.fillStyle = grad
  ctx.fillRect(0, horizon - 8, w, h)

  if (brief.floorStyle === 'marble') {
    ctx.globalAlpha = amount * 0.55
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = Math.max(1.2, w * 0.004)
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.moveTo(rand() * w, horizon + rand() * (h - horizon))
      ctx.bezierCurveTo(rand() * w, horizon + rand() * (h - horizon), rand() * w, h, rand() * w, h)
      ctx.stroke()
    }
  } else if (brief.floorStyle === 'tile' || brief.floorStyle === 'concrete') {
    ctx.globalAlpha = amount * 0.4
    ctx.strokeStyle = brief.floorStyle === 'concrete' ? 'rgba(40,40,40,0.18)' : 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 1
    const step = w / 8
    for (let x = 0; x < w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, horizon)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = horizon; y < h; y += step * 0.55) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  } else {
    ctx.globalAlpha = amount * 0.55
    ctx.strokeStyle = 'rgba(60, 32, 12, 0.38)'
    ctx.lineWidth = Math.max(1, w * 0.0028)
    const vpX = w * (0.42 + rand() * 0.16)
    const vpY = horizon - h * 0.08
    const planks = 11 + Math.floor(rand() * 6)
    for (let i = 0; i <= planks; i++) {
      ctx.beginPath()
      ctx.moveTo((w / planks) * i, h)
      ctx.lineTo(vpX, vpY)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 230, 200, 0.12)'
    for (let i = 0; i < 5; i++) {
      const y = horizon + ((h - horizon) * (0.2 + i * 0.15))
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y + 6)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function applyWindowLight(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, cool: boolean) {
  const gx = w * (0.14 + rand() * 0.12)
  const gy = h * 0.22
  const g = ctx.createRadialGradient(gx, gy, 6, gx, gy, Math.max(w, h) * 0.48)
  g.addColorStop(0, cool ? 'rgba(190,215,240,0.22)' : 'rgba(255,214,150,0.22)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(2, r))
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

function drawRug(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number, color: RGB) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,10,8,0.22)'
  oval(ctx, cx, cy + rh * 0.08, rw, rh)
  ctx.fill()
  ctx.fillStyle = css(color)
  oval(ctx, cx, cy, rw, rh)
  ctx.fill()
  ctx.strokeStyle = css(shade(color, 1.25), 0.7)
  ctx.lineWidth = Math.max(3, rw * 0.04)
  ctx.stroke()
  ctx.restore()
}

function drawSofa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: RGB,
  pillow: RGB,
  wood: RGB,
  cushions: number,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,12,8,0.32)'
  oval(ctx, x + w / 2, y + h * 0.96, w * 0.46, h * 0.1)
  ctx.fill()

  ctx.fillStyle = css(wood)
  const legW = Math.max(4, w * 0.03)
  ctx.fillRect(x + w * 0.08, y + h * 0.84, legW, h * 0.12)
  ctx.fillRect(x + w * 0.88 - legW, y + h * 0.84, legW, h * 0.12)

  ctx.fillStyle = css(shade(body, 0.78))
  rr(ctx, x + w * 0.04, y, w * 0.92, h * 0.46, h * 0.08)
  ctx.fill()

  ctx.fillStyle = css(body)
  rr(ctx, x, y + h * 0.32, w, h * 0.56, h * 0.1)
  ctx.fill()

  ctx.fillStyle = css(shade(body, 0.7))
  rr(ctx, x, y + h * 0.28, w * 0.12, h * 0.58, h * 0.08)
  ctx.fill()
  rr(ctx, x + w * 0.88, y + h * 0.28, w * 0.12, h * 0.58, h * 0.08)
  ctx.fill()

  const inner = w * 0.72
  const start = x + w * 0.14
  for (let i = 0; i < cushions; i++) {
    const cw = inner / cushions - 6
    const cx = start + i * (inner / cushions)
    ctx.fillStyle = css(shade(body, 1.08))
    rr(ctx, cx, y + h * 0.38, cw, h * 0.34, 10)
    ctx.fill()
  }

  ctx.fillStyle = css(pillow)
  rr(ctx, x + w * 0.2, y + h * 0.42, w * 0.13, h * 0.22, 8)
  ctx.fill()
  rr(ctx, x + w * 0.66, y + h * 0.42, w * 0.13, h * 0.22, 8)
  ctx.fill()
  ctx.restore()
}

function drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wood: RGB, round: boolean) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,12,8,0.28)'
  oval(ctx, x + w / 2, y + h * 0.9, w * 0.42, h * 0.12)
  ctx.fill()
  ctx.fillStyle = css(wood)
  if (round) {
    oval(ctx, x + w / 2, y + h * 0.28, w * 0.48, h * 0.18)
    ctx.fill()
  } else {
    rr(ctx, x, y + h * 0.16, w, h * 0.22, 6)
    ctx.fill()
  }
  ctx.fillStyle = css(shade(wood, 0.72))
  ctx.fillRect(x + w * 0.12, y + h * 0.36, Math.max(4, w * 0.05), h * 0.5)
  ctx.fillRect(x + w * 0.83, y + h * 0.36, Math.max(4, w * 0.05), h * 0.5)
  ctx.fillStyle = css(shade(wood, 1.15))
  if (round) {
    oval(ctx, x + w / 2, y + h * 0.24, w * 0.46, h * 0.12)
  } else {
    rr(ctx, x + 4, y + h * 0.12, w - 8, h * 0.12, 4)
  }
  ctx.fill()
  ctx.restore()
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pot: RGB, leaf: RGB) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,12,8,0.22)'
  oval(ctx, x, y + s * 0.92, s * 0.28, s * 0.08)
  ctx.fill()
  ctx.fillStyle = css(leaf)
  for (const [dx, dy, rx, ry] of [
    [0, 0.22, 0.28, 0.32],
    [-0.18, 0.3, 0.2, 0.26],
    [0.18, 0.3, 0.2, 0.26],
    [0, 0.08, 0.16, 0.2],
  ] as const) {
    oval(ctx, x + s * dx, y + s * dy, s * rx, s * ry)
    ctx.fill()
  }
  ctx.fillStyle = css(pot)
  rr(ctx, x - s * 0.18, y + s * 0.58, s * 0.36, s * 0.34, 8)
  ctx.fill()
  ctx.fillStyle = css(shade(pot, 0.7))
  ctx.fillRect(x - s * 0.2, y + s * 0.56, s * 0.4, s * 0.08)
  ctx.restore()
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, metal: RGB, shade: RGB) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,12,8,0.2)'
  oval(ctx, x, y + h, h * 0.12, h * 0.04)
  ctx.fill()
  ctx.strokeStyle = css(metal)
  ctx.lineWidth = Math.max(3, h * 0.025)
  ctx.beginPath()
  ctx.moveTo(x, y + h * 0.22)
  ctx.lineTo(x, y + h * 0.92)
  ctx.stroke()
  ctx.fillStyle = css(metal)
  oval(ctx, x, y + h * 0.94, h * 0.1, h * 0.03)
  ctx.fill()
  ctx.fillStyle = css(shade)
  ctx.beginPath()
  ctx.moveTo(x - h * 0.16, y + h * 0.22)
  ctx.lineTo(x + h * 0.16, y + h * 0.22)
  ctx.lineTo(x + h * 0.1, y)
  ctx.lineTo(x - h * 0.1, y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawArt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: RGB, mat: RGB, ink: RGB) {
  ctx.save()
  ctx.fillStyle = 'rgba(20,12,8,0.16)'
  ctx.fillRect(x + 6, y + 8, w, h)
  ctx.fillStyle = css(frame)
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = css(mat)
  ctx.fillRect(x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.84)
  ctx.fillStyle = css(ink)
  ctx.fillRect(x + w * 0.16, y + h * 0.2, w * 0.68, h * 0.52)
  ctx.restore()
}

function sofaForStyle(brief: ParsedBrief, rand: () => number): { body: RGB; pillow: RGB; wood: RGB } {
  const palettes: Record<string, { body: string; pillow: string; wood: string }> = {
    scandinavian: { body: '#efe7d8', pillow: '#8a9a7b', wood: '#d4b896' },
    industrial: { body: '#3d3a38', pillow: '#c8c2ba', wood: '#2a2a2a' },
    boho: { body: '#c65d3b', pillow: '#ead7c1', wood: '#6b4a32' },
    japandi: { body: '#e4d8c8', pillow: '#6b4a32', wood: '#c4a574' },
    coastal: { body: '#f4f1ea', pillow: '#4a6fa5', wood: '#d8c3a5' },
    midcentury: { body: '#6b7a3d', pillow: '#c65d3b', wood: '#5c3a21' },
    traditional: { body: '#7a2e3a', pillow: '#e6d5b8', wood: '#5c3a21' },
    minimalist: { body: '#d8d2c8', pillow: '#8b8580', wood: '#d4c4b0' },
    maximalist: { body: '#6b5b95', pillow: '#c65d3b', wood: '#6b4a32' },
    modern: { body: '#4a5560', pillow: '#efe6d5', wood: '#b08968' },
  }
  const p = palettes[brief.style] ?? palettes.modern
  const body = mixRgb(parseCssColor(p.body), parseCssColor(brief.accentColor), 0.08 + rand() * 0.18)
  const pillow = mixRgb(parseCssColor(p.pillow), parseCssColor(brief.wallColor), rand() * 0.2)
  return { body, pillow, wood: parseCssColor(p.wood) }
}

function compositeFurniture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  brief: ParsedBrief,
  rand: () => number,
  variant: number,
) {
  const sofa = sofaForStyle(brief, rand)
  const rug = parseCssColor(mixHex(brief.accentColor, brief.wallColor, 0.35 + rand() * 0.25))
  const leaf = parseCssColor(variant % 2 === 0 ? '#3d6b45' : '#2f5a3a')
  const pot = parseCssColor(variant % 3 === 0 ? '#c4a574' : '#6b4a32')
  const artMat = parseCssColor(brief.wallColor)
  const artInk = parseCssColor(brief.accentColor)
  const frame = sofa.wood
  const lampShade = parseCssColor(mixHex('#f4f1ea', brief.wallColor, 0.3))
  const metal = parseCssColor(brief.style === 'industrial' ? '#3d3a38' : '#c9a227')

  const layouts = variant % 4
  const sofaW = w * (0.46 + (layouts === 2 ? 0.08 : 0))
  const sofaH = h * 0.28
  const sofaX = layouts === 1 ? w * 0.28 : w * 0.4
  const sofaY = horizon - sofaH * 0.42
  const tableW = w * (layouts === 3 ? 0.22 : 0.28)
  const tableH = h * 0.2
  const tableX = sofaX + sofaW * 0.12 - w * 0.04
  const tableY = sofaY + sofaH * 0.55

  drawRug(ctx, tableX + tableW / 2, tableY + tableH * 0.7, w * 0.34, h * 0.08, rug)
  if (layouts !== 1) drawPlant(ctx, w * (0.22 + rand() * 0.04), horizon - h * 0.08, h * 0.28, pot, leaf)
  drawSofa(ctx, sofaX, sofaY, sofaW, sofaH, sofa.body, sofa.pillow, sofa.wood, layouts === 2 ? 4 : 3)
  drawTable(ctx, tableX, tableY, tableW, tableH, sofa.wood, layouts === 3 || brief.style === 'midcentury')
  drawArt(ctx, sofaX + sofaW * 0.28, Math.max(h * 0.16, sofaY - h * 0.22), w * 0.14, h * 0.14, frame, artMat, artInk)
  if (layouts !== 2) drawLamp(ctx, sofaX + sofaW + w * 0.04, horizon - h * 0.34, h * 0.38, metal, lampShade)
  if (layouts === 2 || brief.style === 'boho') {
    drawPlant(ctx, sofaX + sofaW + w * 0.02, horizon - h * 0.02, h * 0.2, pot, leaf)
  }
}

function makeLabel(brief: ParsedBrief, intent: GenerateIntent, refineLevel: number): string {
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
  if (intent === 'refine') return `${vibe} · refined ${refineLevel}`
  if (intent === 'alternate') return `${vibe} · another take`
  return vibe
}

export async function generateDemoDesign(opts: {
  baselineDataUrl: string
  prompt: string
  intent: GenerateIntent
  seed: number
  refineLevel: number
}): Promise<{ dataUrl: string; label: string; recipe: string }> {
  const img = await loadImage(opts.baselineDataUrl)
  const brief = parseBrief(opts.prompt)
  const rand = mulberry32(opts.seed >>> 0)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available.')

  ctx.drawImage(img, 0, 0, w, h)

  const wallCss =
    opts.intent === 'alternate' ? mixHex(brief.wallColor, brief.accentColor, 0.12 + rand() * 0.38) : brief.wallColor
  const wall = parseCssColor(wallCss)
  const floor = parseCssColor(brief.floorStyle === 'keep' ? '#b08968' : brief.floorColor)
  const horizon = h * (0.54 + rand() * 0.05)
  const wallAmt = opts.intent === 'refine' ? Math.min(0.72, 0.5 + opts.refineLevel * 0.07) : 0.46 + rand() * 0.16
  const floorAmt = brief.floorStyle === 'keep' ? 0.28 + rand() * 0.1 : 0.62 + rand() * 0.16
  const variant = Math.floor(rand() * 8) + opts.refineLevel + (opts.intent === 'alternate' ? 3 : 0)

  paintWalls(ctx, w, h, wall, horizon, wallAmt)
  drawFloorSurface(ctx, w, h, horizon, brief, floor, rand, floorAmt)
  compositeFurniture(ctx, w, h, horizon, brief, rand, variant)
  applyWindowLight(ctx, w, h, rand, brief.warmth < 0)
  stampDemoBadge(ctx, w, h)

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    label: makeLabel(brief, opts.intent, opts.refineLevel),
    recipe: recipeLine(brief),
  }
}
