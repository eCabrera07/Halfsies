import type { ParticipantSplit, SplitResult, Ticket, TicketItem } from '../types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function formatMoney(value: number): string {
  return currencyFormatter.format(roundCurrency(value))
}

export function calculateTicketSubtotal(items: TicketItem[]): number {
  return roundCurrency(items.reduce((sum, item) => sum + item.totalPrice, 0))
}

export function calculateGrandTotal(subtotal: number, tax: number, tip: number): number {
  return roundCurrency(subtotal + tax + tip)
}

export function calculateSplit(ticket: Ticket): SplitResult {
  const subtotalBasis = ticket.subtotal > 0 ? ticket.subtotal : calculateTicketSubtotal(ticket.items)
  const taxAndTip = roundCurrency(ticket.tax + ticket.tip)

  const participants: ParticipantSplit[] = ticket.participants.map((participant) => {
    const itemShares = ticket.items.flatMap((item) => {
      if (!item.assignedUserIds.includes(participant.id) || item.assignedUserIds.length === 0) {
        return []
      }

      return [
        {
          itemId: item.id,
          itemName: item.name,
          share: roundCurrency(item.totalPrice / item.assignedUserIds.length),
        },
      ]
    })

    const subtotal = roundCurrency(itemShares.reduce((sum, item) => sum + item.share, 0))
    const taxAndTipShare = subtotalBasis > 0 ? roundCurrency((subtotal / subtotalBasis) * taxAndTip) : 0

    return {
      participantId: participant.id,
      participantName: participant.name,
      paymentStatus: participant.paymentStatus,
      color: participant.color,
      subtotal,
      taxAndTipShare,
      total: roundCurrency(subtotal + taxAndTipShare),
      itemShares,
    }
  })

  const assignedSubtotal = roundCurrency(participants.reduce((sum, participant) => sum + participant.subtotal, 0))
  const assignedTaxAndTip = roundCurrency(participants.reduce((sum, participant) => sum + participant.taxAndTipShare, 0))
  const assignedTotal = roundCurrency(participants.reduce((sum, participant) => sum + participant.total, 0))
  const unassignedSubtotal = roundCurrency(
    ticket.items
      .filter((item) => item.assignedUserIds.length === 0)
      .reduce((sum, item) => sum + item.totalPrice, 0),
  )

  return {
    ticketId: ticket.id,
    subtotal: roundCurrency(subtotalBasis),
    tax: roundCurrency(ticket.tax),
    tip: roundCurrency(ticket.tip),
    grandTotal: roundCurrency(ticket.grandTotal),
    participants,
    assignedSubtotal,
    assignedTaxAndTip,
    assignedTotal,
    unassignedSubtotal,
    unallocatedTaxAndTip: roundCurrency(taxAndTip - assignedTaxAndTip),
  }
}
