import { parseReceiptTextWithStrategies } from '../utils/receiptParsers'
import type { OcrReceiptResult } from '../types'
import { createNoopImagePreprocessor, type ImagePreprocessor } from './imagePreprocessor'

export interface OcrService {
  processImage(image: File | string): Promise<OcrReceiptResult>
}

const sampleReceiptText = `
  2 Birria Tacos           17.98
  Chips and Guacamole       9.50
  Baja Fish Taco            7.25
  Agua Fresca               4.00
  Subtotal                 38.73
  Tax                       3.10
  Suggested Tip             7.75
  Total                    49.58
`

export function parseReceiptText(
  rawText: string,
  options: { provider?: string; confidence?: number; preprocessingOperations?: string[] } = {},
): OcrReceiptResult {
  const parsed = parseReceiptTextWithStrategies(rawText)
  return {
    provider: options.provider ?? 'parser',
    rawText,
    items: parsed.items,
    subtotal: parsed.subtotal,
    tax: parsed.tax,
    tip: parsed.tip,
    grandTotal: parsed.grandTotal,
    confidence: options.confidence ?? estimateConfidence(rawText, parsed.items.length),
    warnings: parsed.warnings,
    preprocessingOperations: options.preprocessingOperations ?? [],
  }
}

export class MockOcrService implements OcrService {
  private readonly imagePreprocessor: ImagePreprocessor

  constructor(imagePreprocessor: ImagePreprocessor = createNoopImagePreprocessor()) {
    this.imagePreprocessor = imagePreprocessor
  }

  async processImage(image: File | string): Promise<OcrReceiptResult> {
    const preparedImage = await this.imagePreprocessor.prepareReceiptImage(image)
    void preparedImage.image
    await new Promise((resolve) => globalThis.setTimeout(resolve, 350))
    return parseReceiptText(sampleReceiptText, {
      provider: 'mock',
      confidence: 0.86,
      preprocessingOperations: preparedImage.operations,
    })
  }
}

function estimateConfidence(rawText: string, itemCount: number): number {
  if (!rawText.trim() || itemCount === 0) {
    return 0
  }

  return 0.7
}
