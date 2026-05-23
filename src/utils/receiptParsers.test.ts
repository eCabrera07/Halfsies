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

  it('parses quantity prefixes', () => {
    const result = parseReceiptTextWithStrategies('2 Tacos 18.00')
    expect(result.items[0]).toMatchObject({ name: 'Tacos', quantity: 2, totalPrice: 18 })
  })

  it('parses quantity suffixes', () => {
    const result = parseReceiptTextWithStrategies('Tacos x2 18.00')
    expect(result.items[0]).toMatchObject({ name: 'Tacos', quantity: 2, totalPrice: 18 })
  })

  it('ignores payment related lines', () => {
    const result = parseReceiptTextWithStrategies(`
      Pizza 15.00
      Total 15.00
      Visa ****1234 15.00
      Change 0.00
    `)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Pizza')
  })
})
