import { create } from 'zustand'
import type { AppStep, OcrReceiptResult, Ticket, TicketItem, User } from '../types'
import { calculateGrandTotal, calculateTicketSubtotal, roundCurrency } from '../utils/splitCalculator'

const participantColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#be123c']

interface TicketState {
  currentStep: AppStep
  ticket: Ticket
  isProcessingReceipt: boolean
  lastOcrResult?: OcrReceiptResult
  receiptPreviewUrl?: string
  resetTicket: () => void
  setStep: (step: AppStep) => void
  setReceiptPreviewUrl: (url?: string) => void
  setIsProcessingReceipt: (isProcessing: boolean) => void
  applyOcrResult: (result: OcrReceiptResult) => void
  replaceItems: (items: TicketItem[]) => void
  updateItem: (itemId: string, patch: Partial<TicketItem>) => void
  addItem: () => void
  removeItem: (itemId: string) => void
  updateCharges: (patch: Pick<Partial<Ticket>, 'tax' | 'tip'>) => void
  addParticipant: (name: string) => void
  updateParticipant: (participantId: string, patch: Partial<User>) => void
  removeParticipant: (participantId: string) => void
  toggleItemAssignment: (itemId: string, participantId: string) => void
}

const hostId = 'host-1'

export const useTicketStore = create<TicketState>((set) => ({
  currentStep: 'upload',
  ticket: createInitialTicket(),
  isProcessingReceipt: false,
  resetTicket: () =>
    set({
      currentStep: 'upload',
      ticket: createInitialTicket(),
      isProcessingReceipt: false,
      lastOcrResult: undefined,
      receiptPreviewUrl: undefined,
    }),
  setStep: (step) => set({ currentStep: step }),
  setReceiptPreviewUrl: (url) => set({ receiptPreviewUrl: url }),
  setIsProcessingReceipt: (isProcessing) => set({ isProcessingReceipt: isProcessing }),
  applyOcrResult: (result) =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        items: result.items.map(normalizeItem),
        tax: result.tax ?? state.ticket.tax,
        tip: result.tip ?? state.ticket.tip,
      }),
      lastOcrResult: result,
      currentStep: 'review',
    })),
  replaceItems: (items) =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        items: items.map(normalizeItem),
      }),
      currentStep: 'review',
    })),
  updateItem: (itemId, patch) =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        items: state.ticket.items.map((item) => (item.id === itemId ? normalizeItem({ ...item, ...patch }) : item)),
      }),
    })),
  addItem: () =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        items: [
          ...state.ticket.items,
          {
            id: createId('item'),
            name: 'New item',
            quantity: 1,
            pricePerUnit: 0,
            totalPrice: 0,
            assignedUserIds: [],
          },
        ],
      }),
    })),
  removeItem: (itemId) =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        items: state.ticket.items.filter((item) => item.id !== itemId),
      }),
    })),
  updateCharges: (patch) =>
    set((state) => ({
      ticket: recalculateTicket({
        ...state.ticket,
        ...patch,
      }),
    })),
  addParticipant: (name) =>
    set((state) => ({
      ticket: {
        ...state.ticket,
        participants: [
          ...state.ticket.participants,
          {
            id: createId('user'),
            name: name.trim() || `Guest ${state.ticket.participants.length + 1}`,
            isHost: false,
            paymentStatus: 'pending',
            color: participantColors[state.ticket.participants.length % participantColors.length],
          },
        ],
      },
    })),
  updateParticipant: (participantId, patch) =>
    set((state) => ({
      ticket: {
        ...state.ticket,
        participants: state.ticket.participants.map((participant) =>
          participant.id === participantId ? { ...participant, ...patch } : participant,
        ),
      },
    })),
  removeParticipant: (participantId) =>
    set((state) => ({
      ticket: {
        ...state.ticket,
        participants: state.ticket.participants.filter((participant) => participant.id !== participantId),
        items: state.ticket.items.map((item) => ({
          ...item,
          assignedUserIds: item.assignedUserIds.filter((id) => id !== participantId),
        })),
      },
    })),
  toggleItemAssignment: (itemId, participantId) =>
    set((state) => ({
      ticket: {
        ...state.ticket,
        items: state.ticket.items.map((item) => {
          if (item.id !== itemId) {
            return item
          }

          const isAssigned = item.assignedUserIds.includes(participantId)
          return {
            ...item,
            assignedUserIds: isAssigned
              ? item.assignedUserIds.filter((id) => id !== participantId)
              : [...item.assignedUserIds, participantId],
          }
        }),
      },
    })),
}))

function createInitialTicket(): Ticket {
  return {
    id: createId('ticket'),
    hostId,
    items: [],
    subtotal: 0,
    tax: 0,
    tip: 0,
    grandTotal: 0,
    participants: [
      {
        id: hostId,
        name: 'Host',
        isHost: true,
        paymentStatus: 'pending',
        color: participantColors[0],
      },
    ],
  }
}

function normalizeItem(item: TicketItem): TicketItem {
  const quantity = Math.max(Number(item.quantity) || 1, 0.01)
  const pricePerUnit = roundCurrency(Number(item.pricePerUnit) || 0)
  return {
    ...item,
    quantity,
    pricePerUnit,
    totalPrice: roundCurrency(quantity * pricePerUnit),
  }
}

function recalculateTicket(ticket: Ticket): Ticket {
  const subtotal = calculateTicketSubtotal(ticket.items)
  return {
    ...ticket,
    subtotal,
    tax: roundCurrency(Number(ticket.tax) || 0),
    tip: roundCurrency(Number(ticket.tip) || 0),
    grandTotal: calculateGrandTotal(subtotal, Number(ticket.tax) || 0, Number(ticket.tip) || 0),
  }
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
