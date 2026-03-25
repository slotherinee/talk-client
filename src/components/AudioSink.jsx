import { useRef, useEffect } from "react";

function AudioSink({ stream, muted, volume = 1 }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      const tryPlay = async () => {
        try {
          await ref.current.play();
        } catch (e) {
        }
      };
      ref.current.onloadedmetadata = tryPlay;
      tryPlay();
    }
  }, [stream]);

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  return (
    <audio ref={ref} autoPlay playsInline muted={muted} className="hidden" />
  );
}

export default AudioSink;