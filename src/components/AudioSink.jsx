import { useRef, useEffect } from 'react'

function AudioSink({ stream, muted, volume = 1 }) {
  const audioRef = useRef()

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.srcObject = stream || null
    if (stream) el.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    const el = audioRef.current
    if (!el || muted) return
    const val = Math.max(0, Math.min(1, volume))
    console.log('AudioSink volume:', val, 'raw:', volume)
    el.volume = val
  }, [volume, muted])

  return (
    <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />
  )
}

export default AudioSink
