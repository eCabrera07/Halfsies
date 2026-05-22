import { describe, expect, it } from 'vitest'
import type { Ticket } from '../types'
import { calculateSplit, formatMoney } from './splitCalculator'

const ticket: Ticket = {
  id: 'ticket-1',
  hostId: 'user-1',
  subtotal: 100,
  tax: 8,
  tip: 20,
  grandTotal: 128,
  participants: [
    { id: 'user-1', name: 'Avery', isHost: true, paymentStatus: 'pending' },
    { id: 'user-2', name: 'Blair', isHost: false, paymentStatus: 'pending' },
    { id: 'user-3', name: 'Casey', isHost: false, paymentStatus: 'pending' },
  ],
  items: [
    {
      id: 'item-1',
      name: 'Tacos',
      quantity: 2,
      pricePerUnit: 15,
      totalPrice: 30,
      assignedUserIds: ['user-1'],
    },
    {
      id: 'item-2',
      name: 'Queso',
      quantity: 1,
      pricePerUnit: 30,
      totalPrice: 30,
      assignedUserIds: ['user-1', 'user-2'],
    },
    {
      id: 'item-3',
      name: 'Enchiladas',
      quantity: 1,
      pricePerUnit: 40,
      totalPrice: 40,
      assignedUserIds: ['user-3'],
    },
  ],
}

describe('calculateSplit', () => {
  it('allocates split items and tax/tip proportionally to assigned food subtotals', () => {
    const result = calculateSplit(ticket)

    expect(result.participants).toEqual([
      expect.objectContaining({
        participantId: 'user-1',
        subtotal: 45,
        taxAndTipShare: 12.6,
        total: 57.6,
      }),
      expect.objectContaining({
        participantId: 'user-2',
        subtotal: 15,
        taxAndTipShare: 4.2,
        total: 19.2,
      }),
      expect.objectContaining({
        participantId: 'user-3',
        subtotal: 40,
        taxAndTipShare: 11.2,
        total: 51.2,
      }),
    ])
    expect(result.assignedTotal).toBe(128)
  })

  it('keeps unassigned food out of participant totals and reports the remainder', () => {
    const result = calculateSplit({
      ...ticket,
      items: [
        ...ticket.items,
        {
          id: 'item-4',
          name: 'Mystery soda',
          quantity: 1,
          pricePerUnit: 5,
          totalPrice: 5,
          assignedUserIds: [],
        },
      ],
      subtotal: 105,
      grandTotal: 133,
    })

    expect(result.unassignedSubtotal).toBe(5)
    expect(result.unallocatedTaxAndTip).toBe(1.33)
    expect(result.assignedTotal).toBe(126.67)
  })

  it('returns zero shares when the ticket subtotal is zero', () => {
    const result = calculateSplit({ ...ticket, subtotal: 0, items: [], tax: 0, tip: 0, grandTotal: 0 })

    expect(result.participants.every((participant) => participant.total === 0)).toBe(true)
    expect(result.assignedTotal).toBe(0)
  })
})

describe('formatMoney', () => {
  it('formats currency values consistently for summaries', () => {
    expect(formatMoney(19.2)).toBe('$19.20')
  })
})
