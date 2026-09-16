import { hexToRgb, loadImage, mixHex } from './imageUtils'
import { parseBrief, recipeLine } from './promptParser'
import { mulberry32 } from './rng'
import type { GenerateIntent, ParsedBrief } from '../types'

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function stampDemoNotAi(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bar = Math.max(52, Math.round(h * 0.1))
  ctx.save()
  ctx.fillStyle = 'rgba(16, 8, 6, 0.82)'
  ctx.fillRect(0, 0, w, bar)
  ctx.fillStyle = '#FFD27A'
  ctx.font = `700 ${Math.max(20, Math.round(w * 0.048))}px Outfit, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('DEMO — not real AI', w / 2, bar / 2)
  ctx.restore()

  ctx.save()
  ctx.translate(w * 0.5, h * 0.58)
  ctx.rotate(-0.42)
  ctx.font = `800 ${Math.max(48, Math.round(w * 0.14))}px Outfit, system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255, 90, 95, 0.2)'
  ctx.textAlign = 'center'
  ctx.fillText('DEMO', 0, 0)
  ctx.restore()
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(20,10,8,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, amount: number) {
  const tile = 128
  const grain = document.createElement('canvas')
  grain.width = tile
  grain.height = tile
  const gctx = grain.getContext('2d')
  if (!gctx) return
  const img = gctx.createImageData(tile, tile)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * amount * 8
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 40
  }
  gctx.putImageData(img, 0, 0)
  const pattern = ctx.createPattern(grain, 'repeat')
  if (!pattern) return
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.28
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function applyColorWash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brief: ParsedBrief,
  intensity: number,
  rand: () => number,
) {
  const rgb = hexToRgb(brief.wallColor)
  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.35 + intensity * 0.35})`
  ctx.fillRect(0, 0, w, h)

  if (brief.warmth > 0) {
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `rgba(255, 160, 80, ${Math.min(0.35, brief.warmth + intensity * 0.12)})`
    ctx.fillRect(0, 0, w, h)
  } else if (brief.warmth < 0) {
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `rgba(80, 120, 180, ${Math.min(0.28, Math.abs(brief.warmth) + intensity * 0.08)})`
    ctx.fillRect(0, 0, w, h)
  }

  if (brief.saturation < 0) {
    ctx.globalCompositeOperation = 'saturation'
    ctx.globalAlpha = Math.min(0.45, Math.abs(brief.saturation) + 0.1)
    ctx.fillStyle = '#888'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()

  // Slight random exposure jitter so alternates don't look identical.
  ctx.save()
  ctx.globalCompositeOperation = rand() > 0.5 ? 'screen' : 'multiply'
  ctx.globalAlpha = 0.06 + rand() * 0.06
  ctx.fillStyle = rand() > 0.5 ? '#fff5e8' : '#1a1210'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function applyWallWash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  intensity: number,
  rand: () => number,
) {
  const horizon = h * (0.5 + rand() * 0.08)
  const rgb = hexToRgb(color)
  ctx.save()
  const g = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.12)
  g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.42 + intensity * 0.28})`)
  g.addColorStop(0.72, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.22 + intensity * 0.18})`)
  g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
  ctx.fillStyle = g
  ctx.globalCompositeOperation = 'color'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(w, 0)
  ctx.lineTo(w, horizon)
  ctx.lineTo(0, horizon + h * 0.06)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function applyFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brief: ParsedBrief,
  intensity: number,
  rand: () => number,
) {
  if (brief.floorStyle === 'keep') return
  const top = h * (0.52 + rand() * 0.06)
  const rgb = hexToRgb(brief.floorColor)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, top + h * 0.05)
  ctx.lineTo(w, top)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.clip()

  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.28 + intensity * 0.25})`
  ctx.fillRect(0, top, w, h - top)

  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.35 + intensity * 0.2
  if (brief.floorStyle === 'wood') {
    const vpX = w * (0.42 + rand() * 0.16)
    const vpY = top - h * 0.08
    ctx.strokeStyle = 'rgba(80, 40, 16, 0.35)'
    ctx.lineWidth = Math.max(1, w * 0.004)
    const planks = 14 + Math.floor(rand() * 6)
    for (let i = 0; i <= planks; i++) {
      const x = (w / planks) * i
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.lineTo(vpX, vpY)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 220, 170, 0.12)'
    for (let y = top; y < h; y += 18 + rand() * 10) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y - 8)
      ctx.stroke()
    }
  } else if (brief.floorStyle === 'marble') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(0, top, w, h - top)
    ctx.strokeStyle = 'rgba(90,90,90,0.15)'
    for (let i = 0; i < 12; i++) {
      ctx.beginPath()
      ctx.moveTo(rand() * w, top + rand() * (h - top))
      ctx.bezierCurveTo(rand() * w, rand() * h, rand() * w, rand() * h, rand() * w, h)
      ctx.stroke()
    }
  } else if (brief.floorStyle === 'tile') {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 2
    const size = 48
    for (let y = top; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        ctx.strokeRect(x, y, size, size)
      }
    }
  } else if (brief.floorStyle === 'carpet') {
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
    ctx.fillRect(0, top, w, h - top)
  } else {
    ctx.fillStyle = 'rgba(120,120,120,0.2)'
    ctx.fillRect(0, top, w, h - top)
  }
  ctx.restore()
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cool: boolean) {
  ctx.save()
  roundedRect(ctx, x, y, w, h, 8)
  ctx.fillStyle = cool ? '#9ec5d8' : '#f2d7a6'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y)
  ctx.lineTo(x + w / 2, y + h)
  ctx.moveTo(x, y + h / 2)
  ctx.lineTo(x + w, y + h / 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rand: () => number) {
  ctx.save()
  ctx.fillStyle = '#6b4a32'
  roundedRect(ctx, x - 14 * scale, y, 28 * scale, 22 * scale, 4 * scale)
  ctx.fill()
  ctx.fillStyle = '#3d6b45'
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    const ang = -Math.PI / 2 + (i - 2.5) * 0.35
    const len = (36 + rand() * 18) * scale
    ctx.ellipse(x + Math.cos(ang) * 8 * scale, y - Math.sin(ang) * 6 * scale, 8 * scale, len, ang, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawFurnitureOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brief: ParsedBrief,
  rand: () => number,
  intent: GenerateIntent,
) {
  const shift = intent === 'alternate' ? 0.08 + rand() * 0.1 : rand() * 0.04
  const left = w * (0.12 + shift)
  const floorY = h * 0.78
  const sofaW = w * (0.55 + rand() * 0.12)
  const sofaH = h * (brief.room === 'bedroom' ? 0.16 : 0.2)
  const sofaX = left
  const sofaY = floorY - sofaH

  // Rug
  ctx.save()
  ctx.fillStyle = brief.style === 'boho' ? 'rgba(180, 80, 50, 0.35)' : 'rgba(40, 30, 24, 0.22)'
  ctx.beginPath()
  ctx.ellipse(w * 0.5, h * 0.86, w * 0.38, h * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (brief.room === 'bedroom') {
    ctx.fillStyle = brief.accentColor
    roundedRect(ctx, w * 0.18, h * 0.48, w * 0.64, h * 0.28, 18)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    roundedRect(ctx, w * 0.22, h * 0.5, w * 0.56, h * 0.08, 10)
    ctx.fill()
  } else {
    // Sofa
    ctx.fillStyle = brief.accentColor
    roundedRect(ctx, sofaX, sofaY, sofaW, sofaH, 22)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    roundedRect(ctx, sofaX + 16, sofaY + 14, sofaW * 0.42, sofaH * 0.55, 14)
    ctx.fill()
    roundedRect(ctx, sofaX + sofaW * 0.5, sofaY + 14, sofaW * 0.42, sofaH * 0.55, 14)
    ctx.fill()

    // Coffee table
    ctx.fillStyle = brief.floorColor
    roundedRect(ctx, w * 0.34, h * 0.82, w * 0.32, h * 0.045, 8)
    ctx.fill()
  }

  drawPlant(ctx, w * (0.12 + rand() * 0.08), h * 0.8, 1 + rand() * 0.4, rand)

  // Art frames on the wall
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 4
  ctx.fillStyle = brief.wallColor
  const artX = w * (0.55 + rand() * 0.1)
  roundedRect(ctx, artX, h * 0.16, w * 0.18, h * 0.16, 6)
  ctx.fill()
  ctx.stroke()
  roundedRect(ctx, artX + w * 0.2, h * 0.2, w * 0.1, h * 0.12, 6)
  ctx.fill()
  ctx.stroke()

  if (rand() > 0.4) {
    drawWindow(ctx, w * (0.08 + rand() * 0.06), h * 0.12, w * 0.22, h * 0.28, brief.warmth < 0)
  }

  // Floor lamp
  ctx.strokeStyle = 'rgba(30,20,16,0.55)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(w * 0.86, h * 0.82)
  ctx.lineTo(w * 0.86, h * 0.28)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 214, 150, 0.55)'
  ctx.beginPath()
  ctx.ellipse(w * 0.86, h * 0.26, 28, 16, 0, 0, Math.PI * 2)
  ctx.fill()
}

function applyLighting(ctx: CanvasRenderingContext2D, w: number, h: number, brief: ParsedBrief, rand: () => number) {
  ctx.save()
  const gx = w * (0.2 + rand() * 0.2)
  const gy = h * 0.18
  const g = ctx.createRadialGradient(gx, gy, 10, gx, gy, Math.max(w, h) * 0.55)
  const glow = brief.warmth >= 0 ? '255,196,120' : '180,210,240'
  g.addColorStop(0, `rgba(${glow},0.32)`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function makeLabel(brief: ParsedBrief, intent: GenerateIntent, refineLevel: number): string {
  const vibe =
    brief.style === 'midcentury'
      ? 'Mid-century glow'
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
                    : brief.wallName === 'orange' || brief.wallName === 'terracotta'
                      ? 'Terracotta crush'
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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')

  ctx.drawImage(img, 0, 0, w, h)

  const intensity =
    opts.intent === 'refine'
      ? Math.min(0.9, 0.55 + opts.refineLevel * 0.1)
      : 0.58 + rand() * 0.14

  const wall =
    opts.intent === 'alternate' ? mixHex(brief.wallColor, brief.accentColor, 0.2 + rand() * 0.35) : brief.wallColor
  applyColorWash(ctx, w, h, brief, intensity, rand)
  applyWallWash(ctx, w, h, wall, intensity, rand)
  applyFloor(ctx, w, h, brief, intensity, rand)

  const overlay = document.createElement('canvas')
  overlay.width = w
  overlay.height = h
  const octx = overlay.getContext('2d')
  if (octx) {
    drawFurnitureOverlay(octx, w, h, brief, rand, opts.intent)
    ctx.save()
    ctx.globalAlpha = 0.1 + intensity * 0.08
    ctx.globalCompositeOperation = 'soft-light'
    ctx.drawImage(overlay, 0, 0)
    ctx.restore()
  }

  applyLighting(ctx, w, h, brief, rand)
  applyGrain(ctx, w, h, rand, 16)
  applyVignette(ctx, w, h, 0.32)

  stampDemoNotAi(ctx, w, h)

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    label: makeLabel(brief, opts.intent, opts.refineLevel),
    recipe: recipeLine(brief),
  }
}
