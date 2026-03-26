import { useRef, useEffect } from 'react'

let sharedCtx = null

function getSharedCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedCtx
}

function AudioSink({ stream, muted, volume = 1 }) {
  const audioRef = useRef()
  const gainRef = useRef(null)
  const sourceRef = useRef(null)

  // Keep audio element srcObject in sync
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.srcObject = stream || null
    if (stream && !muted) el.play().catch(() => {})
  }, [stream, muted])

  // Build Web Audio graph when stream/muted changes
  useEffect(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch {}
      sourceRef.current = null
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect() } catch {}
      gainRef.current = null
    }

    if (!stream || muted) {
      // Let audio element handle muted state natively
      if (audioRef.current) audioRef.current.muted = true
      return
    }

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
      // Mute the audio element — Web Audio handles actual output
      if (audioRef.current) audioRef.current.muted = true
    } catch (e) {
      // Web Audio failed: fall back to native audio element (volume capped at 1)
      console.warn('AudioSink: Web Audio failed, using fallback:', e.message)
      if (audioRef.current) {
        audioRef.current.muted = false
        audioRef.current.volume = Math.min(1, Math.max(0, volume))
      }
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
    if (gainRef.current) {
      gainRef.current.gain.value = muted ? 0 : Math.max(0, volume)
      const ctx = gainRef.current.context
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    } else if (audioRef.current && !audioRef.current.muted) {
      audioRef.current.volume = muted ? 0 : Math.min(1, Math.max(0, volume))
    }
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

  // Always-muted audio element: holds srcObject for autoplay policy + fallback
  return <audio ref={audioRef} autoPlay playsInline muted className="hidden" />
}

export default AudioSink
