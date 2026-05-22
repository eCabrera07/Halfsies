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
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Halfsies</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Shared breakdown</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <ReceiptText aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-950">Ticket {payload.ticketId.slice(0, 12)}</p>
            <p className="text-sm text-slate-500">{new Date(payload.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {payload.participants.map((participant) => (
            <div className="flex items-center justify-between gap-3 py-3" key={participant.name}>
              <div>
                <p className="font-semibold text-slate-950">{participant.name}</p>
                <p className="text-sm text-slate-500">{participant.status}</p>
              </div>
              <p className="font-semibold text-slate-950">{formatMoney(participant.total)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="font-semibold text-slate-600">Grand total</span>
          <span className="text-xl font-semibold text-slate-950">{formatMoney(payload.grandTotal)}</span>
        </div>
      </div>
    </section>
  )
}
