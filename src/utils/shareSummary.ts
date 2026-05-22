import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { SharedSummaryPayload, SplitResult } from '../types'
import { formatMoney } from './splitCalculator'

export function createSharePayload(split: SplitResult): SharedSummaryPayload {
  return {
    ticketId: split.ticketId,
    participants: split.participants.map((participant) => ({
      name: participant.participantName,
      total: participant.total,
      status: participant.paymentStatus,
    })),
    grandTotal: split.grandTotal,
    createdAt: new Date().toISOString(),
  }
}

export function encodeSharePayload(payload: SharedSummaryPayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeSharePayload(encoded: string): SharedSummaryPayload | null {
  const json = decompressFromEncodedURIComponent(encoded)
  if (!json) {
    return null
  }

  try {
    return JSON.parse(json) as SharedSummaryPayload
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharedSummaryPayload, origin = window.location.origin): string {
  const encoded = encodeSharePayload(payload)
  return `${origin}?summary=${encoded}`
}

export function buildMarkdownBreakdown(split: SplitResult, url: string): string {
  const lines = [
    'Halfsies breakdown',
    '',
    ...split.participants.map((participant) => `- ${participant.participantName}: ${formatMoney(participant.total)}`),
    '',
    `Grand total: ${formatMoney(split.grandTotal)}`,
    url,
  ]

  return lines.join('\n')
}
