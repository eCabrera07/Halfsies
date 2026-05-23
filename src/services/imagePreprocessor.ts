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

interface BrowserReceiptImagePreprocessorOptions {
  maxLongEdge?: number
  threshold?: number
}

export interface ImagePreprocessor {
  prepareReceiptImage(image: File | string): Promise<PreparedReceiptImage>
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

export class BrowserReceiptImagePreprocessor implements ImagePreprocessor {
  private readonly maxLongEdge: number
  private readonly threshold: number

  constructor(options: BrowserReceiptImagePreprocessorOptions = {}) {
    this.maxLongEdge = options.maxLongEdge ?? 1800
    this.threshold = options.threshold ?? 172
  }

  async prepareReceiptImage(image: File | string): Promise<PreparedReceiptImage> {
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
    const enhancedPixels = enhanceReceiptPixels(imageData.data, { threshold: this.threshold })
    imageData.data.set(enhancedPixels)
    context.putImageData(imageData, 0, 0)
    releaseImageSource(source)

    return {
      image: await canvasToPngBlob(canvas),
      operations: [
        `resize:${source.width}x${source.height}->${dimensions.width}x${dimensions.height}`,
        'grayscale',
        `threshold:${this.threshold}`,
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

async function loadImageSource(image: File | string): Promise<LoadedImageSource> {
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
