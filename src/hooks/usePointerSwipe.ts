import { useCallback, useEffect, useRef, useState } from 'react'

const THRESHOLD = 108

type Drag = { x: number; y: number; active: boolean }

export function usePointerSwipe(enabled: boolean, onLike: () => void, onPass: () => void) {
  const cardRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ x: 0, y: 0, startX: 0, startY: 0, pointerId: -1, active: false })
  const [visual, setVisual] = useState<Drag>({ x: 0, y: 0, active: false })
  const [exit, setExit] = useState<'like' | 'pass' | null>(null)

  const apply = (x: number, y: number, active: boolean) => {
    setVisual({ x, y, active })
    const el = cardRef.current
    if (!el) return
    const rot = x * 0.08
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`
  }

  const reset = useCallback(() => {
    drag.current.active = false
    drag.current.x = 0
    drag.current.y = 0
    const el = cardRef.current
    if (el) {
      el.style.transition = 'transform 0.35s cubic-bezier(.2,.8,.2,1)'
      el.style.transform = 'translate(0px, 0px) rotate(0deg)'
    }
    setVisual({ x: 0, y: 0, active: false })
  }, [])

  const fly = useCallback(
    (dir: 'like' | 'pass') => {
      const el = cardRef.current
      const x = dir === 'like' ? 520 : -520
      if (el) {
        el.style.transition = 'transform 0.38s cubic-bezier(.2,.7,.2,1), opacity 0.38s ease'
        el.style.transform = `translate(${x}px, 40px) rotate(${dir === 'like' ? 18 : -18}deg)`
        el.style.opacity = '0'
      }
      setExit(dir)
      window.setTimeout(() => {
        if (dir === 'like') onLike()
        else onPass()
        if (el) {
          el.style.transition = 'none'
          el.style.transform = 'translate(0px, 0px) rotate(0deg)'
          el.style.opacity = '1'
        }
        setExit(null)
        setVisual({ x: 0, y: 0, active: false })
      }, 360)
    },
    [onLike, onPass],
  )

  useEffect(() => {
    const el = cardRef.current
    if (!el || !enabled) return

    const down = (e: PointerEvent) => {
      if (exit) return
      drag.current.active = true
      drag.current.pointerId = e.pointerId
      drag.current.startX = e.clientX
      drag.current.startY = e.clientY
      el.setPointerCapture(e.pointerId)
      el.style.transition = 'none'
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.active || e.pointerId !== drag.current.pointerId) return
      const x = e.clientX - drag.current.startX
      const y = e.clientY - drag.current.startY
      drag.current.x = x
      drag.current.y = y
      apply(x, y, true)
    }
    const up = (e: PointerEvent) => {
      if (!drag.current.active || e.pointerId !== drag.current.pointerId) return
      drag.current.active = false
      const x = drag.current.x
      if (x > THRESHOLD) fly('like')
      else if (x < -THRESHOLD) fly('pass')
      else reset()
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [enabled, exit, fly, reset])

  return { cardRef, visual, exit, fly, likeAmount: Math.max(0, Math.min(1, visual.x / THRESHOLD)), passAmount: Math.max(0, Math.min(1, -visual.x / THRESHOLD)) }
}
