import { describe, expect, it, vi } from 'vitest'
import { createEnvironmentCameraConstraints, isCameraCaptureSupported, stopMediaStream } from './cameraCapture'

describe('createEnvironmentCameraConstraints', () => {
  it('prefers the rear camera without requesting audio', () => {
    expect(createEnvironmentCameraConstraints()).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
      },
    })
  })
})

describe('isCameraCaptureSupported', () => {
  it('detects getUserMedia support', () => {
    expect(isCameraCaptureSupported({ mediaDevices: { getUserMedia: vi.fn() } })).toBe(true)
    expect(isCameraCaptureSupported({ mediaDevices: undefined })).toBe(false)
  })
})

describe('stopMediaStream', () => {
  it('stops every track in the stream', () => {
    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }, { stop }],
    } as unknown as MediaStream

    stopMediaStream(stream)

    expect(stop).toHaveBeenCalledTimes(2)
  })
})
