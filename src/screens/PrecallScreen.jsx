import { useState, useEffect } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import MicActivityDot from "../components/MicActivityDot";
import DualButton from "../components/DualButton";
import { Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react";

function PrecallScreen({
  micOn,
  camOn,
  micLevel,
  toggleMic,
  toggleCam,
  localVideo,
  stream,
  startCall,
  socketConnected,
  roomId,
  tempName,
  setTempName,
  // Device selection props
  audioDevices = [],
  videoDevices = [],
  currentAudioDevice,
  currentVideoDevice,
  onAudioDeviceSelect,
  onVideoDeviceSelect,
  onInitializeDevices,
  mediaError,
  noiseSuppression,
  onNoiseSuppressionChange,
}) {
  // Anti-ghost-click: delay button readiness after socket connects (Android fix)
  const [readyToJoin, setReadyToJoin] = useState(false);
  useEffect(() => {
    if (!socketConnected) {
      setReadyToJoin(false);
      return;
    }
    const t = setTimeout(() => setReadyToJoin(true), 600);
    return () => clearTimeout(t);
  }, [socketConnected]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-black px-4">
      <div className="rounded-xl shadow-lg p-8 w-full max-w-xl border border-neutral-800 bg-neutral-900">
        <h2 className="text-2xl font-bold mb-4 text-neutral-100">
          Настройка перед звонком
        </h2>

        <div className="mb-4">
          <Input
            type="text"
            placeholder="Ваше имя (необязательно)"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            maxLength={10}
          />
        </div>

        <div className="flex flex-col gap-4 mb-4">
          <DualButton
            mainButton={
              <Button
                variant={micOn ? "default" : "outline"}
                className="w-full rounded-r-none"
                onClick={toggleMic}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                Микрофон
                <MicActivityDot level={micLevel} muted={!micOn} />
              </Button>
            }
            devices={audioDevices}
            currentDeviceId={currentAudioDevice}
            onDeviceSelect={onAudioDeviceSelect}
            type="audio"
            className="flex-1"
            onInitializeDevices={onInitializeDevices}
          />
          {onNoiseSuppressionChange && (
            <button
              onClick={() => onNoiseSuppressionChange(!noiseSuppression)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 transition-colors text-sm text-neutral-300"
            >
              <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${noiseSuppression ? "bg-blue-600" : "bg-neutral-600"}`}>
                <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${noiseSuppression ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              Шумоизоляция
            </button>
          )}

          <DualButton
            mainButton={
              <Button
                variant={camOn ? "default" : "outline"}
                className="w-full rounded-r-none"
                onClick={toggleCam}
              >
                {camOn ? (
                  <Video size={16} className="icon-speaking-pulse" />
                ) : (
                  <VideoOff size={16} />
                )}
                {camOn ? "Камера: Вкл" : "Камера: Выкл"}
              </Button>
            }
            devices={videoDevices}
            currentDeviceId={currentVideoDevice}
            onDeviceSelect={onVideoDeviceSelect}
            type="video"
            className="flex-1"
            onInitializeDevices={onInitializeDevices}
          />
        </div>

        {mediaError && (
          <div className="mb-4 rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            {mediaError}
          </div>
        )}

        <div className="mb-4 flex justify-center">
          {camOn ? (
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              className="w-full h-36 rounded-lg bg-black border border-neutral-800 object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-36 rounded-lg bg-neutral-800 border border-neutral-800 flex items-center justify-center text-neutral-500">
              Камера выключена
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={readyToJoin ? startCall : undefined}
          disabled={!readyToJoin}
        >
          {!socketConnected ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Подключение...
            </>
          ) : !readyToJoin ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Подготовка...
            </>
          ) : (
            "Войти в звонок"
          )}
        </Button>

        <div className="text-xs text-neutral-600 mt-3 break-all">
          Ссылка: {window.location.origin}/{roomId}
        </div>
      </div>
    </div>
  );
}

export default PrecallScreen;
