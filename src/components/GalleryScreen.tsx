import type { SpacePickState } from '../hooks/useSpacePick'

export function GalleryScreen({ sp }: { sp: SpacePickState }) {
  return (
    <section className="screen gallery-screen">
      <button className="text-link" onClick={() => sp.setScreen(sp.current ? 'swipe' : 'upload')}>
        ← Back to swiping
      </button>
      <h2>Looks you loved</h2>
      {sp.saved.length === 0 ? (
        <div className="empty">
          <p>Nothing saved yet. When a redesign makes you want to move in, hit Save.</p>
          <button className="btn primary" onClick={() => sp.setScreen(sp.current ? 'swipe' : 'upload')}>
            Keep swiping
          </button>
        </div>
      ) : (
        <ul className="gallery-grid">
          {sp.saved.map((look) => (
            <li key={look.id} className="saved-card">
              <img src={look.image} alt={look.label} />
              <div className="saved-meta">
                <strong>{look.label}</strong>
                <span>{look.recipe}</span>
                <div className="saved-actions">
                  <button className="btn ghost small" onClick={() => sp.saveLook(look)}>
                    Download
                  </button>
                  {/* Future: affiliate / product graph keyed by look.shopLookId */}
                  <button className="btn ghost small" disabled title="Affiliate products for this look — coming soon">
                    Shop this look
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
