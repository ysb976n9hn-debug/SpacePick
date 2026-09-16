import type { SpacePickState } from '../hooks/useSpacePick'

export function Header({ sp }: { sp: SpacePickState }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => sp.setScreen(sp.original ? 'swipe' : 'upload')} aria-label="SpacePick home">
        <span className="logo-mark" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <path d="M4 15.5L16 6l12 9.5V25a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V15.5z" fill="currentColor" />
            <path
              d="M16 18.4c-2.4-2.2-6.2.6-4.2 3.7 1 .1.6 2.9 4.2 3.5 1.3-.8 3.3-1.9 4.2-3.5 2-3.1-1.8-5.9-4.2-3.7z"
              fill="#FF5A5F"
            />
          </svg>
        </span>
        <span className="brand-type">
          SpacePick
          <em>swipe the room you want</em>
        </span>
      </button>

      <div className="topbar-actions">
        <span
          className={`mode-pill ${sp.mode}`}
          title={sp.mode === 'live' ? `OpenAI ${sp.liveModel ?? 'image'} edits` : 'Labeled demo fallback — tap for live AI setup'}
          onClick={() => sp.setScreen('setup')}
          role="button"
        >
          {sp.mode === 'live' ? 'Live AI' : 'Demo'}
        </span>
        <button className="credits-pill" onClick={() => sp.setPaywallOpen(true)} title="Credits are a stub for future packs / Pro">
          <span className="spark">✦</span>
          {sp.credits.remaining} looks
        </button>
        <button className="icon-btn" onClick={() => sp.setScreen('gallery')} aria-label="Saved gallery">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
            <path d="M7 17l4.2-4.2a1 1 0 0 1 1.4 0L21 17" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {sp.saved.length > 0 && <i className="badge">{sp.saved.length}</i>}
        </button>
      </div>
    </header>
  )
}
