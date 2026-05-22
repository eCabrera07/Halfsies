import type { TicketItem } from '../types'
import { formatMoney, roundCurrency } from './splitCalculator'

export interface ParsedReceiptResult {
  items: TicketItem[]
  subtotal?: number
  tax?: number
  tip?: number
  grandTotal?: number
  warnings: string[]
}

type ReceiptField = 'subtotal' | 'tax' | 'tip' | 'grandTotal'

const ignoredLabels = [
  'amount due',
  'balance',
  'card',
  'cash',
  'change',
  'credit',
  'debit',
  'mastercard',
  'paid',
  'payment',
  'visa',
]

export function parseReceiptTextWithStrategies(rawText: string): ParsedReceiptResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const result: ParsedReceiptResult = {
    items: [],
    warnings: [],
  }

  lines.forEach((line, index) => {
    const amount = extractTrailingAmount(line)
    if (!amount) {
      return
    }

    const label = line.slice(0, amount.index).trim()
    const field = classifyReceiptField(label)
    if (field) {
      result[field] = amount.value
      return
    }

    if (shouldIgnoreLine(label)) {
      return
    }

    const item = parseItemLine(label, amount.value, index)
    if (item) {
      result.items.push(item)
    }
  })

  addReconciliationWarnings(result)

  return result
}

function extractTrailingAmount(line: string): { value: number; index: number } | null {
  const match = line.match(/\$?\s*(-?\d+(?:,\d{3})*(?:\.\d{2}))\s*$/)
  if (!match?.[1] || match.index === undefined) {
    return null
  }

  const value = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value)) {
    return null
  }

  return {
    value: roundCurrency(value),
    index: match.index,
  }
}

function classifyReceiptField(label: string): ReceiptField | null {
  const normalized = normalizeLabel(label)

  if (normalized.includes('subtotal') || normalized === 'sub total') {
    return 'subtotal'
  }

  if (normalized.includes('tax')) {
    return 'tax'
  }

  if (normalized.includes('tip') || normalized.includes('gratuity')) {
    return 'tip'
  }

  if (normalized === 'total' || normalized.includes('grand total') || normalized.includes('amount due')) {
    return 'grandTotal'
  }

  return null
}

function shouldIgnoreLine(label: string): boolean {
  const normalized = normalizeLabel(label)
  return ignoredLabels.some((keyword) => normalized.includes(keyword))
}

function parseItemLine(label: string, totalPrice: number, index: number): TicketItem | null {
  if (totalPrice <= 0) {
    return null
  }

  const prefixMatch = label.match(/^(\d+(?:\.\d+)?)\s*[xX]?\s+(.+)$/)
  const suffixMatch = label.match(/^(.+?)\s+[xX]\s*(\d+(?:\.\d+)?)$/)
  const quantity = prefixMatch?.[1] ? Number(prefixMatch[1]) : suffixMatch?.[2] ? Number(suffixMatch[2]) : 1
  const name = (prefixMatch?.[2] ?? suffixMatch?.[1] ?? label).replace(/[#*]+/g, '').trim()

  if (!name || !Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  return {
    id: createItemId(index, name),
    name,
    quantity,
    pricePerUnit: roundCurrency(totalPrice / quantity),
    totalPrice: roundCurrency(totalPrice),
    assignedUserIds: [],
  }
}

function addReconciliationWarnings(result: ParsedReceiptResult) {
  if (result.subtotal === undefined || result.grandTotal === undefined) {
    return
  }

  const expectedTotal = roundCurrency(result.subtotal + (result.tax ?? 0) + (result.tip ?? 0))
  const difference = roundCurrency(result.grandTotal - expectedTotal)
  if (Math.abs(difference) >= 0.01) {
    result.warnings.push(`Parsed total differs from subtotal + tax + tip by ${formatMoney(Math.abs(difference))}.`)
  }
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function createItemId(index: number, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `item-${index + 1}-${slug || 'receipt-line'}`
}
