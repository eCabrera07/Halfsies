import { describe, expect, it } from 'vitest'
import { parseReceiptTextWithStrategies } from './receiptParsers'

describe('parseReceiptTextWithStrategies', () => {
  it('extracts items and totals from a restaurant receipt', () => {
    const result = parseReceiptTextWithStrategies(`
      2 Street Tacos        18.00
      Chicken Bowl          $14.50
      Subtotal              32.50
      Tax                    2.60
      Suggested Tip          6.00
      Total                 41.10
    `)

    expect(result.items).toEqual([
      expect.objectContaining({ name: 'Street Tacos', quantity: 2, pricePerUnit: 9, totalPrice: 18 }),
      expect.objectContaining({ name: 'Chicken Bowl', quantity: 1, pricePerUnit: 14.5, totalPrice: 14.5 }),
    ])
    expect(result.subtotal).toBe(32.5)
    expect(result.tax).toBe(2.6)
    expect(result.tip).toBe(6)
    expect(result.grandTotal).toBe(41.1)
    expect(result.warnings).toEqual([])
  })

  it('parses quantity suffixes used by some POS systems', () => {
    const result = parseReceiptTextWithStrategies('Tacos x2 18.00')

    expect(result.items[0]).toMatchObject({ name: 'Tacos', quantity: 2, pricePerUnit: 9, totalPrice: 18 })
  })

  it('captures parser warnings when receipt math does not reconcile', () => {
    const result = parseReceiptTextWithStrategies(`
      Burger 10.00
      Subtotal 10.00
      Tax 1.00
      Total 20.00
    `)

    expect(result.warnings).toContain('Parsed total differs from subtotal + tax + tip by $9.00.')
  })
})
