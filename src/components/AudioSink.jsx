import { useRef, useEffect } from "react";

function AudioSink({ stream, muted, volume = 1 }) {
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!stream || muted) return;

    // Use Web Audio API to allow volume > 100%
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainNodeRef.current = gain;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    source.connect(gain);
    gain.connect(ctx.destination);

    // Resume context on user gesture if suspended
    const resume = () => ctx.state === "suspended" && ctx.resume();
    document.addEventListener("click", resume, { once: true });

    return () => {
      document.removeEventListener("click", resume);
      try { source.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      try { ctx.close(); } catch (e) {}
    };
  }, [stream, muted]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : volume;
    }
  }, [volume, muted]);

  return null;
}

export default AudioSink;
