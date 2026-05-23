export type PaymentStatus = 'pending' | 'paid'

export type AppStep = 'upload' | 'review' | 'assign' | 'summary'

export type ParticipantRole = 'host' | 'guest'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

export interface TicketSession {
  id: string
  ticketId: string
  hostId: string
  inviteCode: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  isHost: boolean
  paymentStatus: PaymentStatus
  color?: string
}

export interface TicketItem {
  id: string
  name: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  assignedUserIds: string[]
}

export interface Ticket {
  id: string
  hostId: string
  items: TicketItem[]
  subtotal: number
  tax: number
  tip: number
  grandTotal: number
  participants: User[]
}

export interface OcrReceiptResult {
  provider: string
  rawText: string
  items: TicketItem[]
  subtotal?: number
  tax?: number
  tip?: number
  grandTotal?: number
  confidence: number
  warnings: string[]
  preprocessingOperations: string[]
}

export interface ParticipantSplit {
  participantId: string
  participantName: string
  paymentStatus: PaymentStatus
  color?: string
  subtotal: number
  taxAndTipShare: number
  total: number
  itemShares: ItemShare[]
}

export interface ItemShare {
  itemId: string
  itemName: string
  share: number
}

export interface SplitResult {
  ticketId: string
  subtotal: number
  tax: number
  tip: number
  grandTotal: number
  participants: ParticipantSplit[]
  assignedSubtotal: number
  assignedTaxAndTip: number
  assignedTotal: number
  unassignedSubtotal: number
  unallocatedTaxAndTip: number
}

export interface SharedSummaryPayload {
  ticketId: string
  participants: Array<{
    name: string
    total: number
    status: PaymentStatus
  }>
  grandTotal: number
  createdAt: string
}
