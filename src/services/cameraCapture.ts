interface CameraNavigatorLike {
  mediaDevices?: {
    getUserMedia?: unknown
  }
}

export function createEnvironmentCameraConstraints(): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
    },
  }
}

export function isCameraCaptureSupported(candidate: CameraNavigatorLike = navigator): boolean {
  return typeof candidate.mediaDevices?.getUserMedia === 'function'
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}
