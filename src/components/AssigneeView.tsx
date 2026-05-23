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
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Assign</p>
          <h1 className="mt-1 text-3xl font-semibold text-text-main">People</h1>
        </div>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-border-muted bg-surface px-3 py-2 text-text-main focus:border-emerald-500 focus:outline-none"
            onChange={(event) => setParticipantName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAddParticipant()
              }
            }}
            placeholder="Name"
            value={participantName}
          />
          <button className="rounded-lg bg-slate-950 p-3 text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={handleAddParticipant} title="Add participant" type="button">
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {ticket.participants.map((participant) => (
            <div className="rounded-lg border border-border-muted bg-surface-muted p-3" key={participant.id}>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: participant.color }} />
                <input
                  className="min-w-0 flex-1 rounded-md border border-border-muted bg-surface px-2 py-1 font-medium text-text-main focus:border-emerald-500 focus:outline-none"
                  onChange={(event) => updateParticipant(participant.id, { name: event.target.value })}
                  value={participant.name}
                />
                {!participant.isHost && (
                  <button className="rounded-md p-2 text-text-muted hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/20 dark:hover:text-rose-400" onClick={() => removeParticipant(participant.id)} title="Remove participant" type="button">
                    <UserMinus aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    className={`h-7 w-7 rounded-full border-2 transition ${participant.color === color ? 'border-text-main scale-110' : 'border-surface shadow ring-1 ring-border-muted'}`}
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
            <article className="rounded-lg border border-border-muted bg-surface-muted p-4 shadow-sm" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-main">{item.name}</h2>
                  <p className="text-sm text-text-muted">
                    {item.quantity} x {formatMoney(item.pricePerUnit)}
                  </p>
                </div>
                <p className="font-semibold text-text-main">{formatMoney(item.totalPrice)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ticket.participants.map((participant) => {
                  const selected = item.assignedUserIds.includes(participant.id)

                  return (
                    <button
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        selected 
                          ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500' 
                          : 'border-border-muted bg-surface text-text-muted hover:border-slate-400 hover:text-text-main'
                      }`}
                      key={participant.id}
                      onClick={() => toggleItemAssignment(item.id, participant.id)}
                      type="button"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-white' : ''}`} style={selected ? {} : { backgroundColor: participant.color }} />
                      {participant.name}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-muted pt-4">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border-muted bg-surface-muted px-4 py-3 font-semibold text-text-main transition hover:border-slate-400" onClick={() => setStep('review')} type="button">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Review
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={() => setStep('summary')} type="button">
            Summary
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
