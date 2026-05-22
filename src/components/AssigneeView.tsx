import { ArrowLeft, ArrowRight, Plus, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useTicketStore } from '../store/useTicketStore'
import { formatMoney } from '../utils/splitCalculator'

const colorOptions = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#be123c']

export function AssigneeView() {
  const [participantName, setParticipantName] = useState('')
  const ticket = useTicketStore((state) => state.ticket)
  const addParticipant = useTicketStore((state) => state.addParticipant)
  const removeParticipant = useTicketStore((state) => state.removeParticipant)
  const setStep = useTicketStore((state) => state.setStep)
  const toggleItemAssignment = useTicketStore((state) => state.toggleItemAssignment)
  const updateParticipant = useTicketStore((state) => state.updateParticipant)

  function handleAddParticipant() {
    addParticipant(participantName)
    setParticipantName('')
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Assign</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">People</h1>
        </div>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
            onChange={(event) => setParticipantName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAddParticipant()
              }
            }}
            placeholder="Name"
            value={participantName}
          />
          <button className="rounded-lg bg-slate-950 p-3 text-white" onClick={handleAddParticipant} title="Add participant" type="button">
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {ticket.participants.map((participant) => (
            <div className="rounded-lg border border-slate-200 bg-white p-3" key={participant.id}>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: participant.color }} />
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 font-medium"
                  onChange={(event) => updateParticipant(participant.id, { name: event.target.value })}
                  value={participant.name}
                />
                {!participant.isHost && (
                  <button className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeParticipant(participant.id)} title="Remove participant" type="button">
                    <UserMinus aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    className={`h-7 w-7 rounded-full border-2 ${participant.color === color ? 'border-slate-950' : 'border-white shadow ring-1 ring-slate-200'}`}
                    key={color}
                    onClick={() => updateParticipant(participant.id, { color })}
                    style={{ backgroundColor: color }}
                    title={`Set ${participant.name} color`}
                    type="button"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {ticket.items.map((item) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">{item.name}</h2>
                  <p className="text-sm text-slate-500">
                    {item.quantity} x {formatMoney(item.pricePerUnit)}
                  </p>
                </div>
                <p className="font-semibold text-slate-950">{formatMoney(item.totalPrice)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ticket.participants.map((participant) => {
                  const selected = item.assignedUserIds.includes(participant.id)

                  return (
                    <button
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        selected ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      key={participant.id}
                      onClick={() => toggleItemAssignment(item.id, participant.id)}
                      type="button"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: participant.color }} />
                      {participant.name}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-950" onClick={() => setStep('review')} type="button">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Review
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white" onClick={() => setStep('summary')} type="button">
            Summary
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
