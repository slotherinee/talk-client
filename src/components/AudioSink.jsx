import { useRef, useEffect } from 'react'

let sharedCtx = null

function getAudioContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedCtx
}

function AudioSink({ stream, muted, volume = 1 }) {
  const audioRef = useRef()
  const gainRef = useRef(null)
  const sourceCreatedRef = useRef(false)

  // Build Web Audio graph only for remote (non-muted) audio
  useEffect(() => {
    const el = audioRef.current
    if (!el || muted || sourceCreatedRef.current) return

    try {
      const ctx = getAudioContext()
      const gain = ctx.createGain()
      const source = ctx.createMediaElementSource(el)
      source.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = Math.max(0, volume)
      gainRef.current = gain
      sourceCreatedRef.current = true
    } catch (e) {
      console.warn('AudioSink: GainNode failed, fallback to audio.volume', e)
    }
  }, [muted])

  // Update stream
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.srcObject = stream || null
    if (stream && !muted) {
      el.play().catch(() => {})
    }
  }, [stream, muted])

  // Update volume/gain
  useEffect(() => {
    const val = Math.max(0, volume)
    if (gainRef.current) {
      gainRef.current.gain.value = val
    } else if (audioRef.current && !muted) {
      audioRef.current.volume = Math.min(1, val)
    }
  }, [volume, muted])

  // Resume AudioContext on user interaction
  useEffect(() => {
    if (muted) return
    const resume = () => {
      try {
        const ctx = getAudioContext()
        if (ctx.state === 'suspended') ctx.resume()
      } catch (e) {}
    }
    window.addEventListener('click', resume)
    window.addEventListener('touchstart', resume)
    return () => {
      window.removeEventListener('click', resume)
      window.removeEventListener('touchstart', resume)
    }
  }, [muted])

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      muted={muted}
      className="hidden"
    />
  )
}

export default AudioSink
