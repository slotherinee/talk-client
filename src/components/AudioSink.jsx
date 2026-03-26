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
    console.log('AudioSink: setting srcObject, stream tracks:', stream?.getTracks?.().length || 0, 'muted:', muted)
    el.srcObject = stream || null
    if (stream && !muted) {
      el.play().catch((e) => console.warn('AudioSink: play() failed:', e.message))
    }
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
      console.log('AudioSink: AudioContext state:', ctx.state)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => console.warn('AudioSink: resume() failed'))
      }
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      gain.gain.value = Math.max(0, volume)
      source.connect(gain)
      gain.connect(ctx.destination)
      sourceRef.current = source
      gainRef.current = gain
      console.log('AudioSink: Web Audio graph built, volume:', volume)
      // Mute the audio element — Web Audio handles actual output
      if (audioRef.current) audioRef.current.muted = true
    } catch (e) {
      // Web Audio failed: fall back to native audio element (volume capped at 1)
      console.warn('AudioSink: Web Audio failed:', e.message)
      if (audioRef.current) {
        audioRef.current.muted = false
        audioRef.current.volume = Math.min(1, Math.max(0, volume))
        console.log('AudioSink: using fallback, audio.volume:', audioRef.current.volume)
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
      const newVal = muted ? 0 : Math.max(0, volume)
      gainRef.current.gain.value = newVal
      console.log('AudioSink: GainNode updated, value:', newVal)
      const ctx = gainRef.current.context
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => console.warn('AudioSink: resume() failed'))
      }
    } else if (audioRef.current && !audioRef.current.muted) {
      const newVal = muted ? 0 : Math.min(1, Math.max(0, volume))
      audioRef.current.volume = newVal
      console.log('AudioSink: audio.volume updated:', newVal)
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
