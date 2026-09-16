import { PROMPT_CHIPS } from '../lib/promptParser'
import type { SpacePickState } from '../hooks/useSpacePick'

export function PromptScreen({ sp }: { sp: SpacePickState }) {
  return (
    <section className="screen prompt-screen">
      <button className="text-link" onClick={sp.resetRoom}>
        ← Different photo
      </button>
      <div className="prompt-preview">
        {sp.original && <img src={sp.original} alt="Your room" />}
        <span>Your baseline</span>
      </div>
      <h2>What should we do to this room?</h2>
      <p className="hint">Natural language is perfect. Name colors, flooring, furniture, mood.</p>
      {sp.mode === 'live' ? (
        <p className="live-banner">Live AI is on — OpenAI will photoreal-edit this photo. Header should read Live AI.</p>
      ) : (
        <button className="demo-banner" onClick={() => sp.setScreen('setup')}>
          DEMO mode — not real AI. Tap for exact OPENAI_API_KEY steps (copy .env.example → .env, restart).
        </button>
      )}
      <textarea
        value={sp.prompt}
        onChange={(e) => sp.setPrompt(e.target.value)}
        placeholder='e.g. “Change the flooring, paint the walls orange, and change my furniture.”'
        rows={4}
        maxLength={500}
      />
      <div className="chips">
        {PROMPT_CHIPS.map((chip) => (
          <button key={chip} type="button" className="chip" onClick={() => sp.setPrompt(chip)}>
            {chip}
          </button>
        ))}
      </div>
      <button className="btn primary full" disabled={!sp.prompt.trim()} onClick={() => void sp.startDesigning()}>
        {sp.mode === 'live' ? 'Generate live looks' : 'Generate DEMO looks (not real AI)'}
      </button>
      {sp.mode !== 'live' && (
        <button className="text-link center-link" onClick={() => sp.setScreen('setup')}>
          Add OPENAI_API_KEY for photoreal Live AI
        </button>
      )}
    </section>
  )
}
