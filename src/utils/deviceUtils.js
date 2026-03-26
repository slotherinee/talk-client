// 🎤 Check if browser supports noiseSuppression constraint
const supportsNoiseSuppressionCache = {};

export const supportsNoiseSuppression = async () => {
  if (supportsNoiseSuppressionCache.checked) {
    return supportsNoiseSuppressionCache.result;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { noiseSuppression: true },
    });
    stream.getTracks().forEach((track) => track.stop());
    supportsNoiseSuppressionCache.checked = true;
    supportsNoiseSuppressionCache.result = true;
    return true;
  } catch (e) {
    supportsNoiseSuppressionCache.checked = true;
    supportsNoiseSuppressionCache.result = false;
    return false;
  }
};

// 🎤 Build audio constraints safely
export const buildAudioConstraints = (noiseSuppression = true) => {
  const constraints = {
    echoCancellation: true,
    autoGainControl: true,
  };

  // Only add noiseSuppression if browser might support it
  // (we'll let browser decide if it can, error is handled by caller)
  if (noiseSuppression) {
    constraints.noiseSuppression = true;
  }

  return constraints;
};

export const getUserDevices = async () => {
  try {
    // Request only audio permission to enumerate devices — avoids turning on camera
    await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch(() => {});

    const devices = await navigator.mediaDevices.enumerateDevices();

    const audioInputs = devices
      .filter((device) => device.kind === "audioinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Микрофон ${device.deviceId.slice(0, 8)}`,
        kind: "audioinput",
      }));

    const videoInputs = devices
      .filter((device) => device.kind === "videoinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Камера ${device.deviceId.slice(0, 8)}`,
        kind: "videoinput",
      }));

    const audioOutputs = devices
      .filter((device) => device.kind === "audiooutput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Динамики ${device.deviceId.slice(0, 8)}`,
        kind: "audiooutput",
      }));

    return {
      audioInput: audioInputs,
      videoInput: videoInputs,
      audioOutput: audioOutputs,
    };
  } catch (error) {
    console.warn("Failed to get user devices:", error);
    return {
      audioInput: [],
      videoInput: [],
      audioOutput: [],
    };
  }
};

export const switchToDevice = async (deviceId, kind, context) => {
  try {
    const {
      stream,
      setStream,
      localAudioTrackRef,
      localVideoTrackRef,
      pcs,
      renegotiateWithPeer,
      localVideo,
    } = context;

    // 🔍 Check if we're already using this device (avoid unnecessary switch)
    let currentDeviceId = null;
    if (kind === "audio" && localAudioTrackRef?.current) {
      const settings = localAudioTrackRef.current.getSettings?.();
      currentDeviceId = settings?.deviceId;
    } else if (kind === "video" && localVideoTrackRef?.current) {
      const settings = localVideoTrackRef.current.getSettings?.();
      currentDeviceId = settings?.deviceId;
    }

    if (currentDeviceId === deviceId) {
      console.log(`ℹ️ Already using ${kind} device ${deviceId}, skipping switch`);
      return stream; // Don't do anything
    }

    const constraints = {};

    if (kind === "audio") {
      constraints.audio = { deviceId: { exact: deviceId } };
      if (stream && stream.getVideoTracks().length > 0) {
        constraints.video = true;
      }
    } else if (kind === "video") {
      constraints.video = { deviceId: { exact: deviceId } };
      if (stream && stream.getAudioTracks().length > 0) {
        constraints.audio = true;
      }
    }

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (kind === "audio" && localAudioTrackRef) {
      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localAudioTrackRef.current;

      if (newAudioTrack) {
        localAudioTrackRef.current = newAudioTrack;

        // Replace track in all peer connections
        if (pcs && pcs.current) {
          Object.values(pcs.current).forEach((pc) => {
            try {
              const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
              if (sender) {
                sender.replaceTrack(newAudioTrack).catch((err) => {
                  console.warn("Failed to replace audio track in PC:", err);
                });
              }
            } catch (err) {
              console.warn("Error updating audio track in PC:", err);
            }
          });
        }

        // Stop old track after replacement
        if (oldAudioTrack) {
          try {
            oldAudioTrack.stop();
          } catch (e) {}
        }

        // Update stream
        if (stream) {
          const newStreamTracks = stream
            .getTracks()
            .filter((t) => t.kind !== "audio");
          newStreamTracks.push(newAudioTrack);
          const updatedStream = new MediaStream(newStreamTracks);
          if (setStream) setStream(updatedStream);
        }
      }
    } else if (kind === "video" && localVideoTrackRef) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localVideoTrackRef.current;

      if (newVideoTrack) {
        localVideoTrackRef.current = newVideoTrack;

        // Replace track in all peer connections
        if (pcs && pcs.current) {
          Object.values(pcs.current).forEach((pc) => {
            try {
              const sender = pc.getSenders().find((s) => s.track?.kind === "video");
              if (sender) {
                sender.replaceTrack(newVideoTrack).catch((err) => {
                  console.warn("Failed to replace video track in PC:", err);
                });
              }
            } catch (err) {
              console.warn("Error updating video track in PC:", err);
            }
          });
        }

        // Stop old track after replacement
        if (oldVideoTrack) {
          try {
            oldVideoTrack.stop();
          } catch (e) {}
        }

        // Update stream and video element
        if (stream) {
          const newStreamTracks = stream
            .getTracks()
            .filter((t) => t.kind !== "video");
          newStreamTracks.push(newVideoTrack);
          const updatedStream = new MediaStream(newStreamTracks);
          if (setStream) setStream(updatedStream);
          if (localVideo) {
            localVideo.srcObject = updatedStream;
          }
        }
      }
    }

    // Renegotiate with all peers
    if (pcs && pcs.current && renegotiateWithPeer) {
      Object.keys(pcs.current).forEach((peerId) => {
        const pc = pcs.current[peerId];
        if (pc && (pc.connectionState === "connected" || pc.signalingState === "stable")) {
          setTimeout(() => {
            try {
              renegotiateWithPeer(peerId);
            } catch (err) {
              console.warn("Failed to renegotiate with peer:", peerId, err);
            }
          }, 100);
        }
      });
    }

    return newStream;
  } catch (error) {
    console.warn(`Failed to switch to ${kind} device:`, error);

    // Provide specific error information
    let errorMsg = `Ошибка при переключении ${kind === "audio" ? "микрофона" : "камеры"}`;

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      errorMsg = `Вы запретили доступ к ${kind === "audio" ? "микрофону" : "камере"}`;
    } else if (error.name === "NotFoundError") {
      errorMsg = `${kind === "audio" ? "Микрофон" : "Камера"} не найдена`;
    } else if (error.name === "NotReadableError") {
      errorMsg = `${kind === "audio" ? "Микрофон" : "Камера"} занята другим приложением`;
    }

    const err = new Error(errorMsg);
    err.originalError = error;
    throw err;
  }
};

export const getTrackDevice = (track) => {
  if (!track) return null;

  try {
    const settings = track.getSettings();
    return {
      deviceId: settings.deviceId,
      label: track.label || settings.deviceId?.slice(0, 8) || "Unknown",
    };
  } catch (error) {
    console.warn("Failed to get track device info:", error);
    return null;
  }
};

export const setAudioOutputDevice = async (element, deviceId) => {
  try {
    if (element && element.setSinkId) {
      await element.setSinkId(deviceId);
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Failed to set audio output device:", error);
    return false;
  }
};
