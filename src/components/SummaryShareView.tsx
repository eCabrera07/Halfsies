import { ArrowLeft, CheckCircle2, Copy, Send, WalletCards } from 'lucide-react'
import { useShareResults } from '../hooks/useShareResults'
import { useTicketStore } from '../store/useTicketStore'
import { formatMoney } from '../utils/splitCalculator'

export function SummaryShareView() {
  const ticket = useTicketStore((state) => state.ticket)
  const setStep = useTicketStore((state) => state.setStep)
  const updateParticipant = useTicketStore((state) => state.updateParticipant)
  const { split, shareStatus, shareResults } = useShareResults(ticket)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Summary</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">Pay shares</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white" onClick={shareResults} type="button">
          <Send aria-hidden="true" className="h-4 w-4" />
          Send results
        </button>
      </div>

      {shareStatus !== 'idle' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {shareStatus === 'shared' && 'Shared from this device.'}
          {shareStatus === 'copied' && (
            <span className="inline-flex items-center gap-2">
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copied to clipboard.
            </span>
          )}
          {shareStatus === 'failed' && 'Sharing was cancelled or unavailable.'}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {split.participants.map((participant) => (
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={participant.participantId}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: participant.color }} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{participant.participantName}</h2>
                  <p className="text-sm text-slate-500">{participant.itemShares.length} items</p>
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-950">{formatMoney(participant.total)}</p>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-2">
                <dt className="text-slate-500">Food</dt>
                <dd className="font-semibold text-slate-950">{formatMoney(participant.subtotal)}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <dt className="text-slate-500">Tax/tip</dt>
                <dd className="font-semibold text-slate-950">{formatMoney(participant.taxAndTipShare)}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold text-slate-950">{participant.paymentStatus}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  participant.paymentStatus === 'paid' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-700'
                }`}
                onClick={() => updateParticipant(participant.participantId, { paymentStatus: participant.paymentStatus === 'paid' ? 'pending' : 'paid' })}
                type="button"
              >
                {participant.paymentStatus === 'paid' ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <WalletCards aria-hidden="true" className="h-4 w-4" />}
                {participant.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {(split.unassignedSubtotal > 0 || split.unallocatedTaxAndTip > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Unassigned subtotal {formatMoney(split.unassignedSubtotal)} leaves {formatMoney(split.unallocatedTaxAndTip)} of tax/tip unallocated.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-950" onClick={() => setStep('assign')} type="button">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Assign
        </button>
        <p className="font-semibold text-slate-950">Grand total {formatMoney(split.grandTotal)}</p>
      </div>
    </section>
  )
}
