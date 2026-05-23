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
  'cashless',
  'change',
  'certificate',
  'comp value',
  'credit',
  'debit',
  'invoice',
  'mastercard',
  'paid',
  'payment',
  'reference',
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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const amount = extractReceiptAmount(line)
    if (!amount) {
      continue
    }

    const label = line.slice(0, amount.index).trim()
    const field = classifyReceiptField(label)
    if (field) {
      result[field] = amount.value
      continue
    }

    if (shouldIgnoreLine(label)) {
      continue
    }

    const nextLine = lines[index + 1]
    const itemLabel = isSkuLabel(label) && nextLine && !extractReceiptAmount(nextLine) ? nextLine : label
    const item = parseItemLine(itemLabel, amount.value, index)
    if (item) {
      result.items.push(item)
    }
  }

  addReconciliationWarnings(result)

  return result
}

function extractReceiptAmount(line: string): { value: number; index: number } | null {
  const matches = Array.from(line.matchAll(/\$?\s*(-?\d+(?:,\d{3})*(?:\.\d{2}))(?!\d)/g))
  const match = matches.findLast((candidate) => candidate.index !== undefined && hasOnlyTrailingReceiptCode(line, candidate))
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

  if (normalized.includes('tax') || normalized === 'gov' || normalized === 'mun' || normalized.startsWith('gov ') || normalized.startsWith('mun ')) {
    return 'tax'
  }

  if (normalized.includes('tip') || normalized.includes('gratuity')) {
    return 'tip'
  }

  if (
    normalized === 'total' ||
    normalized.endsWith(' total') ||
    normalized.includes('grand total') ||
    normalized.includes('amount due')
  ) {
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

  const cleanedLabel = label.replace(/\s+/g, ' ').trim()
  const prefixMatch = cleanedLabel.match(/^(\d+(?:\.\d+)?)\s*[xX]?\s+(.+)$/)
  const suffixMatch = cleanedLabel.match(/^(.+?)\s+[xX]\s*(\d+(?:\.\d+)?)$/)
  const quantity = prefixMatch?.[1] ? Number(prefixMatch[1]) : suffixMatch?.[2] ? Number(suffixMatch[2]) : 1
  const name = cleanItemName(prefixMatch?.[2] ?? suffixMatch?.[1] ?? cleanedLabel)

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

function hasOnlyTrailingReceiptCode(line: string, match: RegExpMatchArray): boolean {
  const endIndex = (match.index ?? 0) + match[0].length
  const trailing = line.slice(endIndex).replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  if (!trailing) {
    return true
  }

  return trailing.split(/\s+/).every((token) => token.length <= 3 || /^[a-z]\d[a-z]?$/i.test(token))
}

function isSkuLabel(label: string): boolean {
  const normalized = label.replace(/[^a-z0-9]+/gi, ' ').trim()
  if (!normalized) {
    return false
  }

  const tokens = normalized.split(/\s+/)
  return tokens.length <= 3 && tokens.some((token) => /^\d{5,}$/.test(token)) && tokens.some((token) => /\d/.test(token))
}

function cleanItemName(label: string): string {
  return label
    .replace(/[#*]+/g, '')
    .replace(/^[Il|]\s+(?=[A-Z])/u, '')
    .replace(/\s+T[A-Z0-9]{0,3}$/iu, '')
    .trim()
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
