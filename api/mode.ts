import { readRedesignEnv } from '../server/openaiRedesign'

type VercelRes = {
  status: (code: number) => VercelRes
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default function handler(_req: unknown, res: VercelRes) {
  const env = readRedesignEnv()
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    mode: env.apiKey ? 'live' : 'demo',
    model: env.apiKey ? env.model : null,
  })
}
