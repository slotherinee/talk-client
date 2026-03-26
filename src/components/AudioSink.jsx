import { useRef, useEffect } from 'react'

function AudioSink({ stream, muted, volume = 1 }) {
  const audioRef = useRef()
  const ctxRef = useRef(null)
  const gainRef = useRef(null)
  const sourceRef = useRef(null)

  // Set up stream + Web Audio graph (once per element)
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    el.srcObject = stream

    const tryPlay = async () => {
      try { await el.play() } catch (e) {}
    }
    el.onloadedmetadata = tryPlay
    tryPlay()

    // Build Web Audio graph if not yet built
    if (!ctxRef.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const gain = ctx.createGain()
        const source = ctx.createMediaElementSource(el)
        source.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = volume
        ctxRef.current = ctx
        gainRef.current = gain
        sourceRef.current = source
      } catch (e) {
        // Fallback: just use audio.volume (capped at 1)
      }
    }

    return () => {
      el.onloadedmetadata = null
    }
  }, [stream])

  // Update gain / volume when prop changes
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = Math.max(0, volume)
    } else if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume))
    }
  }, [volume])

  // Resume AudioContext on any user interaction (browsers suspend it by default)
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }
    }
    window.addEventListener('click', resume)
    window.addEventListener('touchstart', resume)
    return () => {
      window.removeEventListener('click', resume)
      window.removeEventListener('touchstart', resume)
    }
  }, [])

  return <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />
}

export default AudioSink
