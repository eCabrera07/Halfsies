import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { useTicketStore } from '../store/useTicketStore'
import { formatMoney } from '../utils/splitCalculator'

export function ReviewEditView() {
  const ticket = useTicketStore((state) => state.ticket)
  const addItem = useTicketStore((state) => state.addItem)
  const removeItem = useTicketStore((state) => state.removeItem)
  const setStep = useTicketStore((state) => state.setStep)
  const updateCharges = useTicketStore((state) => state.updateCharges)
  const updateItem = useTicketStore((state) => state.updateItem)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Review</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">Receipt items</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-950" onClick={addItem} type="button">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add item
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ticket.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    value={item.name}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className="w-20 rounded-md border border-slate-300 px-3 py-2"
                    min="0.01"
                    onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })}
                    step="1"
                    type="number"
                    value={item.quantity}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className="w-28 rounded-md border border-slate-300 px-3 py-2"
                    min="0"
                    onChange={(event) => updateItem(item.id, { pricePerUnit: Number(event.target.value) })}
                    step="0.01"
                    type="number"
                    value={item.pricePerUnit}
                  />
                </td>
                <td className="px-3 py-3 font-semibold text-slate-950">{formatMoney(item.totalPrice)}</td>
                <td className="px-3 py-3 text-right">
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeItem(item.id)} title="Remove item" type="button">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Subtotal</span>
          <input className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2" readOnly value={formatMoney(ticket.subtotal)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Tax</span>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" min="0" onChange={(event) => updateCharges({ tax: Number(event.target.value) })} step="0.01" type="number" value={ticket.tax} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Tip</span>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" min="0" onChange={(event) => updateCharges({ tip: Number(event.target.value) })} step="0.01" type="number" value={ticket.tip} />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="font-semibold text-slate-950">Grand total {formatMoney(ticket.grandTotal)}</p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white" onClick={() => setStep('assign')} type="button">
          Assign
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
