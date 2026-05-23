import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CameraUploadView } from './CameraUploadView'

describe('CameraUploadView', () => {
  it('uses mobile file capture instead of webcam video', () => {
    render(<CameraUploadView />)
    const captureInput = screen.getByLabelText(/capture receipt/i, { selector: 'input' })

    expect(captureInput).toHaveAttribute('type', 'file')
    expect(captureInput).toHaveAttribute('accept', 'image/*')
    expect(captureInput).toHaveAttribute('capture', 'environment')
  })
})
