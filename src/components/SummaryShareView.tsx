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
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Summary</p>
          <h1 className="mt-1 text-3xl font-semibold text-text-main">Pay shares</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={shareResults} type="button">
          <Send aria-hidden="true" className="h-4 w-4" />
          Send results
        </button>
      </div>

      {shareStatus !== 'idle' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
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
          <article className="rounded-lg border border-border-muted bg-surface-muted p-4 shadow-sm" key={participant.participantId}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: participant.color }} />
                <div>
                  <h2 className="text-lg font-semibold text-text-main">{participant.participantName}</h2>
                  <p className="text-sm text-text-muted">{participant.itemShares.length} items</p>
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-main">{formatMoney(participant.total)}</p>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md bg-surface p-2">
                <dt className="text-text-muted text-xs">Food</dt>
                <dd className="font-semibold text-text-main">{formatMoney(participant.subtotal)}</dd>
              </div>
              <div className="rounded-md bg-surface p-2">
                <dt className="text-text-muted text-xs">Tax/tip</dt>
                <dd className="font-semibold text-text-main">{formatMoney(participant.taxAndTipShare)}</dd>
              </div>
              <div className="rounded-md bg-surface p-2">
                <dt className="text-text-muted text-xs">Status</dt>
                <dd className="font-semibold text-text-main capitalize">{participant.paymentStatus}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  participant.paymentStatus === 'paid' 
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400' 
                    : 'border-border-muted bg-surface text-text-muted hover:border-slate-400 hover:text-text-main'
                }`}
                onClick={() => updateParticipant(participant.participantId, { paymentStatus: participant.paymentStatus === 'paid' ? 'pending' : 'paid' })}
                type="button"
              >
                {participant.paymentStatus === 'paid' ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <WalletCards aria-hidden="true" className="h-4 w-4" />}
                {participant.paymentStatus === 'paid' ? 'Paid' : 'Mark as paid'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {(split.unassignedSubtotal > 0 || split.unallocatedTaxAndTip > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          Unassigned subtotal {formatMoney(split.unassignedSubtotal)} leaves {formatMoney(split.unallocatedTaxAndTip)} of tax/tip unallocated.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border-muted pt-4">
        <button className="inline-flex items-center gap-2 rounded-lg border border-border-muted bg-surface-muted px-4 py-3 font-semibold text-text-main transition hover:border-slate-400" onClick={() => setStep('assign')} type="button">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Assign
        </button>
        <p className="font-semibold text-text-main">Grand total {formatMoney(split.grandTotal)}</p>
      </div>
    </section>
  )
}
