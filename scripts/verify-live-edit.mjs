#!/usr/bin/env node
/**
 * Verify live OpenAI Images edits against the sample room.
 * Usage: OPENAI_API_KEY=sk-... node scripts/verify-live-edit.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apiKey = process.env.OPENAI_API_KEY?.trim()
if (!apiKey) {
  console.error('Set OPENAI_API_KEY to verify live edits.')
  process.exit(2)
}

const jpeg = await readFile(join(root, 'public/sample-room.jpg'))
const file = new File([jpeg], 'room.jpg', { type: 'image/jpeg' })
const models = [process.env.OPENAI_IMAGE_MODEL?.trim(), 'gpt-image-1.5', 'gpt-image-1'].filter(
  (m, i, arr) => m && arr.indexOf(m) === i,
)

const prompt = [
  'This is an image-to-image PHOTO EDIT of the uploaded room.',
  'Preserve camera angle, crop, window, ceiling, trim, furniture, and floor.',
  'WALLS: Repaint the painted wall surfaces a saturated orange / terracotta with eggshell sheen.',
  'Keep white trim and the window view. Do not apply a global color filter.',
  'Output a real photograph of this same room after a painter finished the walls.',
].join(' ')

let lastErr = ''
for (const model of models) {
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', prompt)
  form.append('image', file, file.name)
  form.append('size', '1536x1024')
  form.append('quality', process.env.OPENAI_IMAGE_QUALITY?.trim() || 'medium')
  form.append('output_format', 'jpeg')
  form.append('output_compression', '90')
  if (!model.includes('mini')) form.append('input_fidelity', 'high')

  process.stderr.write(`Trying ${model}…\n`)
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const raw = await res.text()
  if (!res.ok) {
    lastErr = `${model}: ${res.status} ${raw.slice(0, 400)}`
    process.stderr.write(`${lastErr}\n`)
    continue
  }
  const json = JSON.parse(raw)
  const b64 = json.data?.[0]?.b64_json
  if (!b64) {
    lastErr = `${model}: no b64_json`
    continue
  }
  const out = join(root, 'tmp-live-verify.jpg')
  await writeFile(out, Buffer.from(b64, 'base64'))
  console.log(JSON.stringify({ ok: true, model, bytes: Buffer.from(b64, 'base64').length, out }, null, 2))
  process.exit(0)
}

console.error(lastErr || 'All models failed.')
process.exit(1)
