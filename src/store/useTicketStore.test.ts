import { beforeEach, describe, expect, it } from 'vitest'
import type { OcrReceiptResult } from '../types'
import { useTicketStore } from './useTicketStore'

const ocrResult: OcrReceiptResult = {
  provider: 'mock',
  rawText: 'Burger 10.00\nTax 1.00\nTotal 11.00',
  items: [
    {
      id: 'item-1',
      name: 'Burger',
      quantity: 1,
      pricePerUnit: 10,
      totalPrice: 10,
      assignedUserIds: [],
    },
  ],
  subtotal: 10,
  tax: 1,
  tip: 0,
  grandTotal: 11,
  confidence: 0.82,
  warnings: ['Review low-confidence line 1.'],
  preprocessingOperations: ['deskew'],
}

describe('useTicketStore OCR flow', () => {
  beforeEach(() => {
    useTicketStore.getState().resetTicket()
  })

  it('applies structured OCR results to items, charges, and review metadata', () => {
    useTicketStore.getState().applyOcrResult(ocrResult)

    const state = useTicketStore.getState()
    expect(state.ticket.items).toEqual(ocrResult.items)
    expect(state.ticket.tax).toBe(1)
    expect(state.ticket.tip).toBe(0)
    expect(state.ticket.grandTotal).toBe(11)
    expect(state.lastOcrResult).toBe(ocrResult)
    expect(state.currentStep).toBe('review')
  })
})
