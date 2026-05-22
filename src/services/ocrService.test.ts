import { describe, expect, it } from 'vitest'
import { MockOcrService, parseReceiptText } from './ocrService'

describe('parseReceiptText', () => {
  it('parses receipt-like lines into a structured result', () => {
    const result = parseReceiptText(`
      2 Street Tacos        18.00
      Chicken Bowl          $14.50
      Tax                    2.60
      Suggested Tip          6.00
      Total                 41.10
    `)

    expect(result.items).toEqual([
      expect.objectContaining({
        name: 'Street Tacos',
        quantity: 2,
        pricePerUnit: 9,
        totalPrice: 18,
      }),
      expect.objectContaining({
        name: 'Chicken Bowl',
        quantity: 1,
        pricePerUnit: 14.5,
        totalPrice: 14.5,
      }),
    ])
    expect(result.rawText).toContain('Street Tacos')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('ignores non-item totals and malformed lines', () => {
    const result = parseReceiptText(`
      SUBTOTAL 32.50
      BALANCE DUE 41.10
      paid by card
    `)

    expect(result.items).toEqual([])
  })
})

describe('MockOcrService', () => {
  it('returns a structured OCR result for an image input contract', async () => {
    const service = new MockOcrService()

    const result = await service.processImage('mock://receipt.jpg')

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        assignedUserIds: [],
      }),
    )
    expect(result.provider).toBe('mock')
    expect(result.preprocessingOperations).toEqual([])
  })
})
