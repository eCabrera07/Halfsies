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

  it('uses the following product line when a SKU line carries the price', () => {
    const result = parseReceiptTextWithStrategies(`
      6617575 D42798000 0.49
      MTG TARKIR DRAGONSTORM PLAY B
      5.49 Comp. Value
      5.00- My Best Buy Certificate
      Sales Tax 0.06
      Reduced State Tax 0.00
      Municipal Tax 0.00
    `)

    expect(result.items).toEqual([
      expect.objectContaining({
        name: 'MTG TARKIR DRAGONSTORM PLAY B',
        quantity: 1,
        totalPrice: 0.49,
      }),
    ])
  })

  it('keeps receipt item rows while dropping discounts, tax, and payment clutter from OCR text', () => {
    const result = parseReceiptTextWithStrategies(`
      STARBURST CHERRY Ta $1.99 T2F
      CRYSTAL LIGHT GO GRAPE $2.50 T2F
      5.00- My Best Buy Certificate
      GOV [$7.09] $0.74
      TOTAL $14.96
      Visa $14.96
      Balance $0.00
    `)

    expect(result.items).toEqual([
      expect.objectContaining({ name: 'STARBURST CHERRY', totalPrice: 1.99 }),
      expect.objectContaining({ name: 'CRYSTAL LIGHT GO GRAPE', totalPrice: 2.5 }),
    ])
    expect(result.grandTotal).toBe(14.96)
  })

  it('normalizes common OCR quantity mistakes on fast-food lines', () => {
    const result = parseReceiptTextWithStrategies(`
      I Big Mac Meal 9.89
      I Big Mac
      I M Mocha Frappe 2.90
      ADD Crushed Oreo 0.35 Ee
      Subtotal 13.14
      Tax 0.86
      Take-Out Total 14.00
      Cashless 14.00
      Change 0.00
    `)

    expect(result.items).toEqual([
      expect.objectContaining({ name: 'Big Mac Meal', quantity: 1, totalPrice: 9.89 }),
      expect.objectContaining({ name: 'M Mocha Frappe', quantity: 1, totalPrice: 2.9 }),
      expect.objectContaining({ name: 'ADD Crushed Oreo', quantity: 1, totalPrice: 0.35 }),
    ])
  })

  it('parses warehouse receipt rows with leading tax codes, SKUs, and OCR punctuation', () => {
    const result = parseReceiptTextWithStrategies(`
      CE - POLISH SAUSG 17.9 E
      E 1165912 KS ALMND BAR 10.99 E
      E // 1782177 KS CHKN FILL, 13:98 E
      E[ 222464 MOZZ STIS. 16.19 E
    `)

    expect(result.items).toEqual([
      expect.objectContaining({ name: 'POLISH SAUSG', totalPrice: 17.9 }),
      expect.objectContaining({ name: 'KS ALMND BAR', totalPrice: 10.99 }),
      expect.objectContaining({ name: 'KS CHKN FILL', totalPrice: 13.98 }),
      expect.objectContaining({ name: 'MOZZ STIS', totalPrice: 16.19 }),
    ])
  })

  it('warns when parsed item prices do not reconcile with the printed subtotal', () => {
    const result = parseReceiptTextWithStrategies(`
      E[ 222464 MOZZ STIS. 16.19 E
      SUBTOTAL 16.79
    `)

    expect(result.warnings).toContain('Parsed item totals differ from the receipt subtotal by $0.60.')
  })
})
