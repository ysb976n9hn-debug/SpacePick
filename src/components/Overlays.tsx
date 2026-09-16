import type { SpacePickState } from '../hooks/useSpacePick'

export function PaywallSheet({ sp }: { sp: SpacePickState }) {
  if (!sp.paywallOpen) return null
  return (
    <div className="sheet-backdrop" onClick={() => sp.setPaywallOpen(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="paywall-title">
        <h3 id="paywall-title">Looks & Pro</h3>
        <p>
          You have <strong>{sp.credits.remaining}</strong> preview looks on the free stub. Real billing is not wired in v1 —
          generation is unlimited while we build packs.
        </p>
        <ul className="plan-list">
          <li>
            <strong>Free</strong>
            <span>Labeled demo previews, Live AI when a key is set</span>
          </li>
          <li>
            <strong>Pro</strong>
            <span>Live photoreal edits, rewind last swipe, no watermark</span>
            <em>Coming soon</em>
          </li>
          <li>
            <strong>Credit packs</strong>
            <span>Top up live generations without a subscription</span>
            <em>Coming soon</em>
          </li>
        </ul>
        <button className="btn primary full" onClick={() => sp.setPaywallOpen(false)}>
          Keep swiping
        </button>
      </div>
    </div>
  )
}

export function Toasts({ sp }: { sp: SpacePickState }) {
  if (sp.toasts.length === 0) return null
  return (
    <div className="toasts">
      {sp.toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  )
}
