import type { TicketItem } from '../types'

export interface OcrService {
  processImage(image: File | string): Promise<TicketItem[]>
}

const nonItemKeywords = [
  'amount due',
  'balance',
  'card',
  'cash',
  'change',
  'credit',
  'debit',
  'discount',
  'gratuity',
  'mastercard',
  'paid',
  'payment',
  'subtotal',
  'suggested',
  'tax',
  'tip',
  'total',
  'visa',
]

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

export function parseReceiptText(rawText: string): TicketItem[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap((line, index) => parseReceiptLine(line, index))
}

function parseReceiptLine(line: string, index: number): TicketItem[] {
  const lower = line.toLowerCase()
  if (nonItemKeywords.some((keyword) => lower.includes(keyword))) {
    return []
  }

  const priceMatch = line.match(/\$?\s*(-?\d+(?:\.\d{2}))\s*$/)
  if (!priceMatch?.[1]) {
    return []
  }

  const totalPrice = Number(priceMatch[1])
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return []
  }

  const description = line.slice(0, priceMatch.index).trim()
  const quantityMatch = description.match(/^(\d+(?:\.\d+)?)\s*[xX]?\s+(.+)$/)
  const quantity = quantityMatch?.[1] ? Number(quantityMatch[1]) : 1
  const name = (quantityMatch?.[2] ?? description).replace(/[#*]+/g, '').trim()

  if (!name || !Number.isFinite(quantity) || quantity <= 0) {
    return []
  }

  return [
    {
      id: createItemId(index, name),
      name,
      quantity,
      pricePerUnit: roundToCurrency(totalPrice / quantity),
      totalPrice: roundToCurrency(totalPrice),
      assignedUserIds: [],
    },
  ]
}

function createItemId(index: number, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `item-${index + 1}-${slug || 'receipt-line'}`
}

function roundToCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export class MockOcrService implements OcrService {
  async processImage(image: File | string): Promise<TicketItem[]> {
    void image
    await new Promise((resolve) => globalThis.setTimeout(resolve, 350))
    return parseReceiptText(sampleReceiptText)
  }
}
