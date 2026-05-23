import { ReceiptText } from 'lucide-react'
import type { SharedSummaryPayload } from '../types'
import { formatMoney } from '../utils/splitCalculator'

interface SharedSummaryViewProps {
  payload: SharedSummaryPayload
}

export function SharedSummaryView({ payload }: SharedSummaryViewProps) {
  return (
    <section className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Halfsies</p>
        <h1 className="mt-1 text-3xl font-semibold text-text-main">Shared breakdown</h1>
      </div>

      <div className="rounded-lg border border-border-muted bg-surface-muted p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border-muted pb-4">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <ReceiptText aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-text-main">Ticket {payload.ticketId.slice(0, 12)}</p>
            <p className="text-sm text-text-muted">{new Date(payload.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="divide-y divide-border-muted">
          {payload.participants.map((participant) => (
            <div className="flex items-center justify-between gap-3 py-3" key={participant.name}>
              <div>
                <p className="font-semibold text-text-main">{participant.name}</p>
                <p className="text-sm text-text-muted capitalize">{participant.status}</p>
              </div>
              <p className="font-semibold text-text-main">{formatMoney(participant.total)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border-muted pt-4">
          <span className="font-semibold text-text-muted">Grand total</span>
          <span className="text-xl font-semibold text-text-main">{formatMoney(payload.grandTotal)}</span>
        </div>
      </div>
    </section>
  )
}
