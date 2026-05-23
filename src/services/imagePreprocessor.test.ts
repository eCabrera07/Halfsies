import { describe, expect, it } from 'vitest'
import { calculateResizeDimensions, createNoopImagePreprocessor, enhanceReceiptPixels } from './imagePreprocessor'

describe('createNoopImagePreprocessor', () => {
  it('returns the original image while preserving a computer vision contract', async () => {
    const preprocessor = createNoopImagePreprocessor()
    const image = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' })

    const result = await preprocessor.prepareReceiptImage(image)

    expect(result.image).toBe(image)
    expect(result.operations).toEqual([])
  })
})

describe('calculateResizeDimensions', () => {
  it('keeps small images at their original dimensions', () => {
    expect(calculateResizeDimensions({ width: 900, height: 1200, maxLongEdge: 1800 })).toEqual({
      width: 900,
      height: 1200,
      scale: 1,
    })
  })

  it('downscales large images to the configured long edge', () => {
    expect(calculateResizeDimensions({ width: 3000, height: 4000, maxLongEdge: 2000 })).toEqual({
      width: 1500,
      height: 2000,
      scale: 0.5,
    })
  })
})

describe('enhanceReceiptPixels', () => {
  it('converts pixels to high contrast grayscale while preserving alpha', () => {
    const pixels = new Uint8ClampedArray([
      20, 20, 20, 255,
      240, 240, 240, 128,
    ])

    const enhanced = enhanceReceiptPixels(pixels, { threshold: 128 })

    expect(Array.from(enhanced)).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 128,
    ])
  })
})
