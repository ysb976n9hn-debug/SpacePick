import { Header } from './components/Header'
import { UploadScreen } from './components/UploadScreen'
import { PromptScreen } from './components/PromptScreen'
import { SwipeScreen } from './components/SwipeScreen'
import { GalleryScreen } from './components/GalleryScreen'
import { PaywallSheet, Toasts } from './components/Overlays'
import { useSpacePick } from './hooks/useSpacePick'

export default function App() {
  const sp = useSpacePick()

  return (
    <div className="app">
      <div className="ambient" aria-hidden>
        <span className="orb one" />
        <span className="orb two" />
        <span className="orb three" />
      </div>
      <div className="phone">
        <Header sp={sp} />
        <main>
          {sp.screen === 'upload' && <UploadScreen sp={sp} />}
          {sp.screen === 'prompt' && <PromptScreen sp={sp} />}
          {sp.screen === 'swipe' && <SwipeScreen sp={sp} />}
          {sp.screen === 'gallery' && <GalleryScreen sp={sp} />}
        </main>
      </div>
      <PaywallSheet sp={sp} />
      <Toasts sp={sp} />
    </div>
  )
}
