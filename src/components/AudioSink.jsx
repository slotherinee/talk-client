import { useRef, useEffect } from 'react'

let sharedCtx = null

function getSharedCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedCtx
}

function AudioSink({ stream, muted, volume = 1 }) {
  const gainRef = useRef(null)
  const sourceRef = useRef(null)

  // Build/rebuild Web Audio graph when stream or muted changes
  useEffect(() => {
    // Disconnect previous graph
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch {}
      sourceRef.current = null
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect() } catch {}
      gainRef.current = null
    }

    if (!stream || muted) return

    try {
      const ctx = getSharedCtx()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      gain.gain.value = Math.max(0, volume)
      source.connect(gain)
      gain.connect(ctx.destination)
      sourceRef.current = source
      gainRef.current = gain
    } catch (e) {
      console.warn('AudioSink: Web Audio failed:', e.message)
    }

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch {}
        sourceRef.current = null
      }
      if (gainRef.current) {
        try { gainRef.current.disconnect() } catch {}
        gainRef.current = null
      }
    }
  }, [stream, muted])

  // Update gain value when volume changes
  useEffect(() => {
    if (!gainRef.current) return
    gainRef.current.gain.value = muted ? 0 : Math.max(0, volume)
    const ctx = gainRef.current.context
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  }, [volume, muted])

  // Resume AudioContext on user gesture
  useEffect(() => {
    const resume = () => {
      if (sharedCtx && sharedCtx.state === 'suspended') {
        sharedCtx.resume().catch(() => {})
      }
    }
    window.addEventListener('click', resume)
    window.addEventListener('touchstart', resume)
    return () => {
      window.removeEventListener('click', resume)
      window.removeEventListener('touchstart', resume)
    }
  }, [])

  return null
}

export default AudioSink
