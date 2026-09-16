import type { SpacePickState } from '../hooks/useSpacePick'

export function SetupScreen({ sp }: { sp: SpacePickState }) {
  return (
    <section className="screen setup-screen">
      {sp.original ? (
        <button className="text-link" onClick={() => sp.setScreen('prompt')}>
          ← Back to brief
        </button>
      ) : (
        <button className="text-link" onClick={() => sp.setScreen('upload')}>
          ← Back
        </button>
      )}

      <p className="eyebrow">Live AI vs labeled demo</p>
      <h2>Photoreal edits need an API key.</h2>
      <p className="lede">
        Canvas mockups are labeled <strong>DEMO MOCKUP — not real AI</strong> and are not the product. Photoreal paint,
        floors, and furniture need <code>OPENAI_API_KEY</code>. After the key is set and the app is restarted, the header
        pill must read <strong>Live AI</strong> — if it still says DEMO, the server did not pick up the key.
      </p>

      <ol className="setup-steps">
        <li>
          Create a key at{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            platform.openai.com/api-keys
          </a>
          . GPT Image may need{' '}
          <a href="https://platform.openai.com/settings/organization/general" target="_blank" rel="noreferrer">
            organization verification
          </a>
          .
        </li>
        <li>
          <strong>Local:</strong> copy <code>.env.example</code> to <code>.env</code> in the project folder, set
          <code> OPENAI_API_KEY=sk-...</code>, then stop and rerun <code>npm run dev</code>. Confirm the header says{' '}
          <strong>Live AI</strong>.
        </li>
        <li>
          <strong>Vercel:</strong> Project → Settings → Environment Variables → add <code>OPENAI_API_KEY</code> for
          Production (and Preview). Redeploy. Hobby plans can time out on slow image edits; local or a Pro function
          timeout works more reliably.
        </li>
        <li>
          <strong>Netlify:</strong> Site configuration → Environment variables → <code>OPENAI_API_KEY</code>, then
          redeploy. Live edits still need a server route (use Vercel or <code>npm run preview</code>).
        </li>
      </ol>

      <p className="hint">
        Optional: <code>OPENAI_IMAGE_MODEL=gpt-image-1.5</code> (default; falls back to <code>gpt-image-1</code>) and{' '}
        <code>OPENAI_IMAGE_QUALITY=high</code> (default). Use <code>medium</code> to spend less.
      </p>

      <button
        className="btn primary full"
        onClick={() => {
          void (async () => {
            const mode = await sp.refreshMode()
            if (mode === 'live' && sp.baseline && sp.prompt.trim()) {
              await sp.startDesigning()
            } else if (mode === 'live') {
              sp.setScreen('upload')
            }
          })()
        }}
      >
        I added the key — check again
      </button>
      <button
        className="btn ghost full"
        onClick={() => {
          if (sp.baseline && sp.prompt.trim()) void sp.startDesigning()
          else sp.setScreen('upload')
        }}
      >
        Continue with labeled demo
      </button>
    </section>
  )
}
