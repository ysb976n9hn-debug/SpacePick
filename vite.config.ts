import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { redesignApiPlugin } from './vite-plugin-redesign'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.OPENAI_API_KEY?.trim() || undefined

  return {
    plugins: [
      react(),
      redesignApiPlugin({
        apiKey,
        model: env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1',
        quality: env.OPENAI_IMAGE_QUALITY?.trim() || 'medium',
      }),
    ],
    server: {
      host: true,
      port: 5173,
    },
    preview: {
      host: true,
      port: 4173,
    },
  }
})
