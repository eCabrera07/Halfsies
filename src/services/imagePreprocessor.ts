export interface PreparedReceiptImage {
  image: File | Blob | string
  operations: string[]
}

interface ResizeInput {
  width: number
  height: number
  maxLongEdge: number
}

interface ResizeResult {
  width: number
  height: number
  scale: number
}

interface EnhanceOptions {
  threshold: number
}

interface AdaptiveThresholdOptions {
  blockSize?: number
  C?: number
}

interface BrowserReceiptImagePreprocessorOptions {
  maxLongEdge?: number
}

export interface ImagePreprocessor {
  prepareReceiptImage(image: File | Blob | string): Promise<PreparedReceiptImage>
}

export function createNoopImagePreprocessor(): ImagePreprocessor {
  return {
    async prepareReceiptImage(image) {
      return {
        image,
        operations: [],
      }
    },
  }
}

export function calculateResizeDimensions(input: ResizeInput): ResizeResult {
  if (input.width <= 0 || input.height <= 0 || input.maxLongEdge <= 0) {
    throw new Error('Image dimensions and maxLongEdge must be positive.')
  }

  const longEdge = Math.max(input.width, input.height)
  if (longEdge <= input.maxLongEdge) {
    return {
      width: input.width,
      height: input.height,
      scale: 1,
    }
  }

  const scale = input.maxLongEdge / longEdge
  return {
    width: Math.round(input.width * scale),
    height: Math.round(input.height * scale),
    scale,
  }
}

export function enhanceReceiptPixels(pixels: Uint8ClampedArray, options: EnhanceOptions): Uint8ClampedArray {
  const enhanced = new Uint8ClampedArray(pixels)

  for (let index = 0; index < enhanced.length; index += 4) {
    const red = enhanced[index] ?? 0
    const green = enhanced[index + 1] ?? 0
    const blue = enhanced[index + 2] ?? 0
    const alpha = enhanced[index + 3] ?? 255
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue
    const value = luminance < options.threshold ? 0 : 255

    enhanced[index] = value
    enhanced[index + 1] = value
    enhanced[index + 2] = value
    enhanced[index + 3] = alpha
  }

  return enhanced
}

export function adaptiveThresholdPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: AdaptiveThresholdOptions = {},
): Uint8ClampedArray {
  const blockSize = options.blockSize ?? 31
  const C = options.C ?? 10
  const halfBlock = Math.floor(blockSize / 2)

  // Compute luminance for each pixel
  const luminance = new Float64Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      luminance[y * width + x] =
        0.299 * (pixels[idx] ?? 0) +
        0.587 * (pixels[idx + 1] ?? 0) +
        0.114 * (pixels[idx + 2] ?? 0)
    }
  }

  // Build summed area table (integral image) for O(1) neighborhood sums
  const integral = new Float64Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lum = luminance[y * width + x] ?? 0
      const above = y > 0 ? (integral[(y - 1) * width + x] ?? 0) : 0
      const left = x > 0 ? (integral[y * width + (x - 1)] ?? 0) : 0
      const aboveLeft = y > 0 && x > 0 ? (integral[(y - 1) * width + (x - 1)] ?? 0) : 0
      integral[y * width + x] = lum + above + left - aboveLeft
    }
  }

  // Apply per-pixel adaptive threshold using integral image
  const result = new Uint8ClampedArray(pixels)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - halfBlock)
      const y1 = Math.max(0, y - halfBlock)
      const x2 = Math.min(width - 1, x + halfBlock)
      const y2 = Math.min(height - 1, y + halfBlock)

      const count = (x2 - x1 + 1) * (y2 - y1 + 1)
      const br = integral[y2 * width + x2] ?? 0
      const bl = x1 > 0 ? (integral[y2 * width + (x1 - 1)] ?? 0) : 0
      const tr = y1 > 0 ? (integral[(y1 - 1) * width + x2] ?? 0) : 0
      const tl = x1 > 0 && y1 > 0 ? (integral[(y1 - 1) * width + (x1 - 1)] ?? 0) : 0
      const mean = (br - bl - tr + tl) / count

      const lum = luminance[y * width + x] ?? 0
      const value = lum < mean - C ? 0 : 255

      const idx = (y * width + x) * 4
      result[idx] = value
      result[idx + 1] = value
      result[idx + 2] = value
      // alpha at idx+3 preserved from copied array
    }
  }

  return result
}

export class BrowserReceiptImagePreprocessor implements ImagePreprocessor {
  private readonly maxLongEdge: number

  constructor(options: BrowserReceiptImagePreprocessorOptions = {}) {
    this.maxLongEdge = options.maxLongEdge ?? 1800
  }

  async prepareReceiptImage(image: File | Blob | string): Promise<PreparedReceiptImage> {
    if (!isBrowserCanvasAvailable()) {
      return {
        image,
        operations: ['browser-preprocess-unavailable'],
      }
    }

    const source = await loadImageSource(image)
    const dimensions = calculateResizeDimensions({
      width: source.width,
      height: source.height,
      maxLongEdge: this.maxLongEdge,
    })
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      releaseImageSource(source)
      return {
        image,
        operations: ['browser-canvas-context-unavailable'],
      }
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, dimensions.width, dimensions.height)
    context.drawImage(source.image, 0, 0, dimensions.width, dimensions.height)

    const imageData = context.getImageData(0, 0, dimensions.width, dimensions.height)
    const enhancedPixels = adaptiveThresholdPixels(imageData.data, dimensions.width, dimensions.height)
    imageData.data.set(enhancedPixels)
    context.putImageData(imageData, 0, 0)
    releaseImageSource(source)

    return {
      image: await canvasToPngBlob(canvas),
      operations: [
        `resize:${source.width}x${source.height}->${dimensions.width}x${dimensions.height}`,
        'adaptive-threshold:31:10',
      ],
    }
  }
}

interface LoadedImageSource {
  image: CanvasImageSource
  width: number
  height: number
  objectUrl?: string
}

function isBrowserCanvasAvailable(): boolean {
  return typeof document !== 'undefined' && typeof Image !== 'undefined' && typeof Blob !== 'undefined'
}

async function loadImageSource(image: File | Blob | string): Promise<LoadedImageSource> {
  const objectUrl = typeof image === 'string' ? undefined : URL.createObjectURL(image)
  const sourceUrl = typeof image === 'string' ? image : objectUrl

  if (!sourceUrl) {
    throw new Error('Unable to create an image source URL.')
  }

  const htmlImage = new Image()
  htmlImage.decoding = 'async'
  htmlImage.src = sourceUrl
  await htmlImage.decode()

  return {
    image: htmlImage,
    width: htmlImage.naturalWidth,
    height: htmlImage.naturalHeight,
    objectUrl,
  }
}

function releaseImageSource(source: LoadedImageSource) {
  if (source.objectUrl) {
    URL.revokeObjectURL(source.objectUrl)
  }
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to convert preprocessed receipt image to PNG.'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}
