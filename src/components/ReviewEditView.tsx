import { ArrowRight, Plus, Trash2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTicketStore } from '../store/useTicketStore'
import { formatMoney, roundCurrency } from '../utils/splitCalculator'

export function ReviewEditView() {
  const ticket = useTicketStore((state) => state.ticket)
  const lastOcrResult = useTicketStore((state) => state.lastOcrResult)
  const addItem = useTicketStore((state) => state.addItem)
  const removeItem = useTicketStore((state) => state.removeItem)
  const setStep = useTicketStore((state) => state.setStep)
  const resetTicket = useTicketStore((state) => state.resetTicket)
  const updateCharges = useTicketStore((state) => state.updateCharges)
  const updateItem = useTicketStore((state) => state.updateItem)

  const [showTaxAdder, setShowTaxAdder] = useState(false)
  const [taxAddend, setTaxAddend] = useState('')

  function applyTaxAddend() {
    const amount = Number(taxAddend)
    if (!Number.isFinite(amount) || amount <= 0) return
    updateCharges({ tax: roundCurrency(ticket.tax + amount) })
    setTaxAddend('')
    setShowTaxAdder(false)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Review</p>
          <h1 className="mt-1 text-3xl font-semibold text-text-main">Receipt items</h1>
        </div>
        <div className="flex gap-2">
          <button 
            className="inline-flex items-center gap-2 rounded-lg border border-border-muted bg-surface-muted px-4 py-2 font-semibold text-text-muted transition hover:border-slate-400 hover:text-text-main" 
            onClick={resetTicket} 
            type="button"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Re-upload receipt
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border-muted bg-surface-muted px-4 py-2 font-semibold text-text-main transition hover:border-slate-400" onClick={addItem} type="button">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {lastOcrResult && (
        <div className="grid gap-3 rounded-lg border border-border-muted bg-surface-muted p-4 text-sm md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            <p className="font-semibold text-text-main">OCR review</p>
            <p className="text-text-muted">Provider: {lastOcrResult.provider}</p>
            <p className="text-text-muted">Confidence: {Math.round(lastOcrResult.confidence * 100)}%</p>
            <p className="text-text-muted">
              Preprocessing:{' '}
              {lastOcrResult.preprocessingOperations.length > 0
                ? lastOcrResult.preprocessingOperations.join(', ')
                : 'none yet'}
            </p>
            {lastOcrResult.warnings.length > 0 && (
              <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                {lastOcrResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
          <label className="space-y-2">
            <span className="block font-semibold text-text-main">Raw OCR text</span>
            <textarea
              className="min-h-36 w-full rounded-md border border-border-muted bg-surface p-3 font-mono text-xs text-text-main"
              readOnly
              value={lastOcrResult.rawText.trim()}
            />
          </label>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-muted bg-surface-muted">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-muted">
            {ticket.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <input
                    className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none"
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    value={item.name}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className="w-20 rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none"
                    min="1"
                    onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Math.round(Number(event.target.value))) })}
                    step="1"
                    type="number"
                    value={Math.round(item.quantity)}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className="w-28 rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none"
                    min="0"
                    onChange={(event) => updateItem(item.id, { pricePerUnit: Number(event.target.value) })}
                    step="0.01"
                    type="number"
                    value={item.pricePerUnit}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className="w-28 rounded-md border border-border-muted bg-surface px-3 py-2 font-semibold text-text-main focus:border-emerald-500 focus:outline-none"
                    min="0"
                    onChange={(event) => updateItem(item.id, { pricePerUnit: roundCurrency(Number(event.target.value) / item.quantity) })}
                    step="0.01"
                    type="number"
                    value={item.totalPrice}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <button className="rounded-lg p-2 text-text-muted hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/20 dark:hover:text-rose-400" onClick={() => removeItem(item.id)} title="Remove item" type="button">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium text-text-muted">
          <span>Subtotal</span>
          <input className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main opacity-70" readOnly value={formatMoney(ticket.subtotal)} />
        </label>
        <div className="space-y-1 text-sm font-medium text-text-muted">
          <span>Tax</span>
          <input
            className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none"
            min="0"
            onChange={(event) => updateCharges({ tax: Number(event.target.value) })}
            step="0.01"
            type="number"
            value={ticket.tax}
          />
          {!showTaxAdder && (
            <button
              aria-label="Add another tax line"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-emerald-500 hover:bg-emerald-500/10"
              onClick={() => { setShowTaxAdder(true); setTaxAddend('') }}
              type="button"
            >
              <Plus size={12} />
              Add tax
            </button>
          )}
          {showTaxAdder && (
            <div className="flex gap-2">
              <input
                aria-label="Additional tax amount"
                autoFocus
                className="w-full rounded-md border border-emerald-500 bg-surface px-3 py-2 text-text-main focus:outline-none"
                min="0"
                onChange={(event) => setTaxAddend(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') applyTaxAddend() }}
                placeholder="e.g. 1.86"
                step="0.01"
                type="number"
                value={taxAddend}
              />
              <button
                className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                disabled={!taxAddend || Number(taxAddend) <= 0}
                onClick={applyTaxAddend}
                type="button"
              >
                +
              </button>
            </div>
          )}
        </div>
        <label className="space-y-1 text-sm font-medium text-text-muted">
          <span>Tip</span>
          <input className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none" min="0" onChange={(event) => updateCharges({ tip: Number(event.target.value) })} step="0.01" type="number" value={ticket.tip} />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-muted pt-4">
        <p className="font-semibold text-text-main">Grand total {formatMoney(ticket.grandTotal)}</p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={() => setStep('assign')} type="button">
          Assign
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
