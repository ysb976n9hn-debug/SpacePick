import { useEffect } from 'react'
import { usePointerSwipe } from '../hooks/usePointerSwipe'
import type { SpacePickState } from '../hooks/useSpacePick'

export function SwipeScreen({ sp }: { sp: SpacePickState }) {
  const canSwipe = !sp.generating && Boolean(sp.current) && !sp.error
  const { cardRef, likeAmount, passAmount, fly } = usePointerSwipe(
    canSwipe,
    () => void sp.swipe('like'),
    () => void sp.swipe('pass'),
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sp.generating || !sp.current || sp.error) return
      if (e.key === 'ArrowRight') fly('like')
      if (e.key === 'ArrowLeft') fly('pass')
      if (e.key === 's' || e.key === 'S') sp.saveCurrent()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fly, sp])

  const displaySrc = sp.showOriginal ? sp.original : sp.current?.image
  const busy = sp.generating
  const empty = !sp.current && !busy

  return (
    <section className="screen swipe-screen">
      {sp.mode !== 'live' && (
        <button className="demo-banner compact" onClick={() => sp.setScreen('setup')}>
          DEMO — not real AI. Tap to add OPENAI_API_KEY for Live AI.
        </button>
      )}
      <div className="swipe-meta">
        <p className="look-label">
          {busy ? 'Redesigning with AI…' : sp.error ? 'Generation failed' : sp.current?.label || 'Your look'}
        </p>
        <p className="look-recipe">{sp.current?.recipe || sp.prompt}</p>
        {sp.history.length > 0 && (
          <p className="history-count">
            {sp.history.filter((h) => h.direction === 'like').length} likes ·{' '}
            {sp.history.filter((h) => h.direction === 'pass').length} passes
          </p>
        )}
      </div>

      <div className="deck">
        <div className="card-shadow" aria-hidden />
        <div className="card-shadow two" aria-hidden />
        <div
          ref={cardRef}
          className={`swipe-card ${busy ? 'busy' : ''}`}
          style={{ touchAction: 'none' }}
        >
          {displaySrc ? (
            <img src={displaySrc} alt={sp.showOriginal ? 'Original room' : 'Redesign proposal'} draggable={false} />
          ) : (
            <div className="card-empty">{empty ? 'Waiting for a live redesign' : 'Drop a photo to begin'}</div>
          )}
          {busy && (
            <div className="card-loading">
              <div className="spinner" />
              <span>
                {sp.mode === 'live'
                  ? 'Photoreal edit of this room — usually 20–40 seconds'
                  : 'Building a labeled DEMO preview (not real AI)…'}
              </span>
            </div>
          )}
          {sp.error && !busy && (
            <div className="card-error">
              <strong>Couldn’t generate that look</strong>
              <p>{sp.error}</p>
              <button className="btn primary" onClick={() => void sp.retryGenerate()}>
                Retry live AI
              </button>
              <button className="btn ghost" onClick={() => sp.setScreen('setup')}>
                API key setup
              </button>
            </div>
          )}
          <div className="stamp like" style={{ opacity: likeAmount }}>
            LIKE
          </div>
          <div className="stamp nope" style={{ opacity: passAmount }}>
            NOPE
          </div>
          {sp.current && !sp.error && (
            <span className={`card-mode ${sp.current.mode}`}>
              {sp.current.mode === 'live' ? 'Live AI' : 'DEMO — not real AI'}
            </span>
          )}
        </div>
      </div>

      <div className="compare-row">
        {sp.original && (
          <button
            className={`original-peek ${sp.showOriginal ? 'on' : ''}`}
            onClick={() => sp.setShowOriginal(!sp.showOriginal)}
            title="Toggle the original photo for comparison"
          >
            <img src={sp.original} alt="Original" />
            <span>{sp.showOriginal ? 'Original' : 'Before'}</span>
          </button>
        )}
        <button className="text-link" onClick={() => sp.setScreen('prompt')}>
          Tweak brief
        </button>
        <button className="text-link" onClick={() => void sp.startOverLooks()}>
          From original
        </button>
        <span className="swipe-hint">← pass · like →</span>
      </div>

      <div className="action-bar">
        <button className="round pass" disabled={!canSwipe} onClick={() => fly('pass')} aria-label="Pass, try another take">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <button className="round save" disabled={!sp.current || busy || Boolean(sp.error)} onClick={sp.saveCurrent} aria-label="Save this look">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 4v12m0 0l-4-4m4 4l4-4M5 19h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="round like" disabled={!canSwipe} onClick={() => fly('like')} aria-label="Like, keep as new baseline">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 21s-6.5-4.3-9-8.2C1.2 10 2.1 6.6 5.2 5.5c1.9-.7 3.9.1 5 1.7 1.1-1.6 3.1-2.4 5-1.7 3.1 1.1 4 4.5 2.2 7.3C18.5 16.7 12 21 12 21z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <p className="fine-print">
        Right keeps this look and refines further. Left discards it and generates a different take from the same baseline.
      </p>
    </section>
  )
}
