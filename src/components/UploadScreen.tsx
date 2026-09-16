import { useRef, useState } from 'react'
import type { SpacePickState } from '../hooks/useSpacePick'

export function UploadScreen({ sp }: { sp: SpacePickState }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void sp.onUploadFile(file)
  }

  return (
    <section className="screen upload-screen">
      <div className="hero-copy">
        <p className="eyebrow">Tinder, but for interiors</p>
        <h1>Fall for a room. Swipe until it feels like home.</h1>
        <p className="lede">
          Drop a photo of your space, describe the glow-up, then swipe right to keep a look as the new baseline — or left for a
          totally different take.
        </p>
      </div>

      <label
        className={`dropzone ${dragging ? 'hot' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <span className="drop-illu" aria-hidden>
          ⌂
        </span>
        <strong>Upload a room photo</strong>
        <span>Living room, bedroom, office — whatever you want to restyle.</span>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          Choose photo
        </button>
      </label>

      <div className="upload-row">
        <button className="btn ghost" onClick={() => cameraRef.current?.click()}>
          Take photo
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <button className="btn primary" onClick={() => void sp.useSample()}>
          Try a sample room
        </button>
      </div>
    </section>
  )
}
