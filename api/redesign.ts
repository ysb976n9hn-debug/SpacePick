import { editRoomPhoto, readRedesignEnv } from '../server/openaiRedesign'

type VercelReq = {
  method?: string
  body?: unknown
}

type VercelRes = {
  status: (code: number) => VercelRes
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
  maxDuration: 60,
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD', message: 'POST only.' })
    return
  }

  const env = readRedesignEnv()
  if (!env.apiKey) {
    res.status(503).json({
      error: 'NO_API_KEY',
      message: 'Set OPENAI_API_KEY in the host environment (Vercel → Settings → Environment Variables), then redeploy.',
    })
    return
  }

  const parsed = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
    imageDataUrl?: string
    prompt?: string
    intent?: string
    aspect?: number
    seed?: number
  }

  if (!parsed?.imageDataUrl || !parsed.prompt?.trim()) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'imageDataUrl and prompt are required.' })
    return
  }

  try {
    const result = await editRoomPhoto(
      { apiKey: env.apiKey, model: env.model, quality: env.quality },
      {
        imageDataUrl: parsed.imageDataUrl,
        prompt: parsed.prompt,
        intent: parsed.intent || 'initial',
        aspect: parsed.aspect,
        seed: parsed.seed,
      },
    )
    res.status(200).json({ image: result.dataUrl, model: result.model, mode: 'live' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed.'
    res.status(500).json({ error: 'GENERATION_FAILED', message })
  }
}
