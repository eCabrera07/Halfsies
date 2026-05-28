import { describe, expect, it } from 'vitest'
import { adaptiveThresholdPixels, calculateResizeDimensions, createNoopImagePreprocessor, enhanceReceiptPixels } from './imagePreprocessor'

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

describe('adaptiveThresholdPixels', () => {
  it('turns a pixel darker than its neighborhood black', () => {
    // 5x1 image: four light pixels surrounding one dark pixel
    // width=5, height=1, blockSize=3, C=10
    const pixels = new Uint8ClampedArray([
      200, 200, 200, 255, // x=0 light
      200, 200, 200, 255, // x=1 light
       10,  10,  10, 255, // x=2 dark — should become black
      200, 200, 200, 255, // x=3 light
      200, 200, 200, 255, // x=4 light
    ])

    const result = adaptiveThresholdPixels(pixels, 5, 1, { blockSize: 3, C: 10 })

    expect(result[8]).toBe(0)   // x=2 red → black
    expect(result[9]).toBe(0)   // x=2 green → black
    expect(result[10]).toBe(0)  // x=2 blue → black
  })

  it('turns pixels lighter than their neighborhood white', () => {
    const pixels = new Uint8ClampedArray([
      200, 200, 200, 255,
      200, 200, 200, 255,
       10,  10,  10, 255,
      200, 200, 200, 255,
      200, 200, 200, 255,
    ])

    const result = adaptiveThresholdPixels(pixels, 5, 1, { blockSize: 3, C: 10 })

    expect(result[0]).toBe(255)  // x=0 → white
    expect(result[4]).toBe(255)  // x=1 → white
    expect(result[12]).toBe(255) // x=3 → white
    expect(result[16]).toBe(255) // x=4 → white
  })

  it('preserves alpha channel for all pixels', () => {
    const pixels = new Uint8ClampedArray([
      200, 200, 200, 200,
      200, 200, 200, 128,
       10,  10,  10,  64,
      200, 200, 200, 255,
      200, 200, 200,  32,
    ])

    const result = adaptiveThresholdPixels(pixels, 5, 1, { blockSize: 3, C: 10 })

    expect(result[3]).toBe(200)  // x=0 alpha preserved
    expect(result[7]).toBe(128)  // x=1 alpha preserved
    expect(result[11]).toBe(64)  // x=2 alpha preserved
    expect(result[15]).toBe(255) // x=3 alpha preserved
    expect(result[19]).toBe(32)  // x=4 alpha preserved
  })

  it('treats a uniformly lit image as all white', () => {
    const pixels = new Uint8ClampedArray([
      100, 100, 100, 255,
      100, 100, 100, 255,
      100, 100, 100, 255,
    ])

    const result = adaptiveThresholdPixels(pixels, 3, 1, { blockSize: 3, C: 10 })

    // Uniform image: mean equals pixel value, pixel is not darker than mean - C
    expect(result[0]).toBe(255)
    expect(result[4]).toBe(255)
    expect(result[8]).toBe(255)
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
