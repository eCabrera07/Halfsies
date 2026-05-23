import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraUploadView } from './CameraUploadView'

describe('CameraUploadView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts a live camera stream from the capture receipt button', async () => {
    const stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

    render(<CameraUploadView />)

    fireEvent.click(screen.getByRole('button', { name: /capture receipt/i }))

    expect(await screen.findByRole('button', { name: /capture photo/i })).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
      },
    })
  })

  it('keeps image upload available as a fallback', () => {
    render(<CameraUploadView />)
    const uploadInput = screen.getByLabelText(/upload image/i, { selector: 'input' })

    expect(uploadInput).toHaveAttribute('type', 'file')
    expect(uploadInput).toHaveAttribute('accept', 'image/*')
  })
})
