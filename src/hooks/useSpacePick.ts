import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSampleRoom } from '../lib/demoGenerator'
import { fetchServerMode, generateLook } from '../lib/generate'
import { downloadDataUrl, fileToDataUrl, resizeImage } from '../lib/imageUtils'
import { randomSeed, uid } from '../lib/rng'
import { loadPersisted, savePersisted } from '../lib/storage'
import type { CreditsState, Design, GenerateIntent, GenerationMode, SavedLook, Screen, SwipeEvent } from '../types'

export type Toast = { id: string; text: string }

const CREDIT_COST = 1

export function useSpacePick() {
  const persisted = useMemo(() => loadPersisted(), [])
  const [screen, setScreen] = useState<Screen>('upload')
  const [original, setOriginal] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(persisted.prompt)
  const [current, setCurrent] = useState<Design | null>(null)
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState<GenerationMode>('demo')
  const [credits, setCredits] = useState<CreditsState>(persisted.credits)
  const [saved, setSaved] = useState<SavedLook[]>(persisted.saved)
  const [history, setHistory] = useState<SwipeEvent[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showOriginal, setShowOriginal] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generatingLock = useRef(false)

  useEffect(() => {
    void fetchServerMode().then(setMode)
  }, [])

  useEffect(() => {
    savePersisted({ prompt, credits, saved })
  }, [prompt, credits, saved])

  const toast = useCallback((text: string) => {
    const id = uid('toast')
    setToasts((t) => [...t, { id, text }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2800)
  }, [])

  const burnCredit = useCallback(() => {
    // Stub only — never blocks the MVP loop. Remaining count is a hook for packs/Pro later.
    setCredits((c) => ({ ...c, remaining: Math.max(0, c.remaining - CREDIT_COST) }))
  }, [])

  const runGenerate = useCallback(
    async (intent: GenerateIntent, source: string, nextRefine: number, seed: number) => {
      if (generatingLock.current) return
      generatingLock.current = true
      setGenerating(true)
      setError(null)
      try {
        const result = await generateLook({
          baselineDataUrl: source,
          prompt,
          intent,
          seed,
          refineLevel: nextRefine,
          preferredMode: mode,
        })
        if (result.fallbackReason) {
          toast(`Live API unavailable — demo preview. ${result.fallbackReason}`)
        }
        const design: Design = {
          id: uid('look'),
          image: result.dataUrl,
          prompt,
          seed,
          intent,
          refineLevel: nextRefine,
          label: result.label,
          recipe: result.recipe,
          mode: result.mode,
          createdAt: Date.now(),
        }
        setCurrent(design)
        burnCredit()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not generate a look.'
        setError(message)
        toast(message)
      } finally {
        setGenerating(false)
        generatingLock.current = false
      }
    },
    [burnCredit, mode, prompt, toast],
  )

  const setPhoto = useCallback(async (dataUrl: string) => {
    const resized = await resizeImage(dataUrl, 1024)
    setOriginal(resized)
    setBaseline(resized)
    setCurrent(null)
    setHistory([])
    setShowOriginal(false)
    setScreen('prompt')
  }, [])

  const onUploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast('Please choose a photo of your room.')
        return
      }
      const url = await fileToDataUrl(file)
      await setPhoto(url)
    },
    [setPhoto, toast],
  )

  const useSample = useCallback(async () => {
    const url = await createSampleRoom()
    await setPhoto(url)
  }, [setPhoto])

  const startDesigning = useCallback(async () => {
    if (!baseline || !prompt.trim()) {
      toast('Add a short redesign brief to continue.')
      return
    }
    setScreen('swipe')
    await runGenerate('initial', baseline, 0, randomSeed())
  }, [baseline, prompt, runGenerate, toast])

  const swipe = useCallback(
    async (direction: 'like' | 'pass') => {
      if (!current || !baseline || generating) return
      setHistory((h) => [...h, { id: uid('swipe'), direction, designId: current.id, at: Date.now() }])
      if (direction === 'like') {
        setBaseline(current.image)
        toast('Kept — generating the next refine.')
        await runGenerate('refine', current.image, current.refineLevel + 1, randomSeed())
      } else {
        toast('Passed — trying a different take.')
        await runGenerate('alternate', baseline, current.refineLevel, randomSeed())
      }
    },
    [baseline, current, generating, runGenerate, toast],
  )

  const saveCurrent = useCallback(() => {
    if (!current || !original) return
    const look: SavedLook = { ...current, original }
    setSaved((s) => [look, ...s.filter((x) => x.id !== look.id)].slice(0, 24))
    downloadDataUrl(current.image, `spacepick-${current.id}.jpg`)
    toast('Saved to your gallery and downloads.')
  }, [current, original, toast])

  const saveLook = useCallback(
    (look: SavedLook) => {
      downloadDataUrl(look.image, `spacepick-${look.id}.jpg`)
      toast('Download started.')
    },
    [toast],
  )

  const resetRoom = useCallback(() => {
    setOriginal(null)
    setBaseline(null)
    setCurrent(null)
    setHistory([])
    setScreen('upload')
    setError(null)
  }, [])

  const startOverLooks = useCallback(async () => {
    if (!original) return
    setBaseline(original)
    setScreen('swipe')
    await runGenerate('initial', original, 0, randomSeed())
  }, [original, runGenerate])

  return {
    screen,
    setScreen,
    original,
    baseline,
    prompt,
    setPrompt,
    current,
    generating,
    mode,
    credits,
    saved,
    history,
    toasts,
    showOriginal,
    setShowOriginal,
    paywallOpen,
    setPaywallOpen,
    error,
    onUploadFile,
    useSample,
    startDesigning,
    swipe,
    saveCurrent,
    saveLook,
    resetRoom,
    startOverLooks,
  }
}

export type SpacePickState = ReturnType<typeof useSpacePick>
