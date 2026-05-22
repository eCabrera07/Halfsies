import { describe, expect, it } from 'vitest'
import { createNoopImagePreprocessor } from './imagePreprocessor'

describe('createNoopImagePreprocessor', () => {
  it('returns the original image while preserving a computer vision contract', async () => {
    const preprocessor = createNoopImagePreprocessor()
    const image = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' })

    const result = await preprocessor.prepareReceiptImage(image)

    expect(result.image).toBe(image)
    expect(result.operations).toEqual([])
  })
})
