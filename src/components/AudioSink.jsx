import { useRef, useEffect } from 'react'

let sharedCtx = null

function getSharedCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedCtx
}

// Resume shared context on user gesture
if (typeof window !== 'undefined') {
  const resume = () => {
    if (sharedCtx && sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {})
  }
  window.addEventListener('click', resume)
  window.addEventListener('touchstart', resume)
}

function AudioSink({ stream, muted, volume = 1 }) {
  const audioRef = useRef()
  const gainRef = useRef(null)
  const graphBuiltRef = useRef(false)

  const buildGraph = () => {
    const el = audioRef.current
    if (!el || graphBuiltRef.current || muted) return
    try {
      const ctx = getSharedCtx()
      const gain = ctx.createGain()
      ctx.createMediaElementSource(el).connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = Math.max(0, volume)
      gainRef.current = gain
      graphBuiltRef.current = true
    } catch (e) {
      // element may already be connected or no stream yet — retry on next stream change
    }
  }

  // Set stream and build graph once stream arrives
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.srcObject = stream || null
    if (stream && !muted) {
      el.play().catch(() => {})
      // Build graph now that the element has a stream
      if (!graphBuiltRef.current) buildGraph()
    }
  }, [stream]) // eslint-disable-line

  // Update gain / volume
  useEffect(() => {
    if (muted) return
    const val = Math.max(0, volume)
    if (gainRef.current) {
      gainRef.current.gain.value = val
      // Also resume context if suspended
      const ctx = gainRef.current.context
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    } else {
      // Fallback: no GainNode yet, use audio.volume (capped at 1)
      if (audioRef.current) audioRef.current.volume = Math.min(1, val)
    }
  }, [volume, muted]) // eslint-disable-line

  return (
    <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />
  )
}

export default AudioSink
