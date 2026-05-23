import type { TicketSession } from '../types'

interface CreateSessionInput {
  ticketId: string
  hostId: string
}

export interface SessionService {
  createSession(input: CreateSessionInput): Promise<TicketSession>
  resolveInvite(inviteCode: string): Promise<TicketSession | null>
}

export function createInMemorySessionService(): SessionService {
  const sessions = new Map<string, TicketSession>()

  return {
    async createSession(input) {
      const now = new Date().toISOString()
      const session: TicketSession = {
        id: `session-${crypto.randomUUID()}`,
        ticketId: input.ticketId,
        hostId: input.hostId,
        inviteCode: crypto.randomUUID().replace(/-/g, '').slice(0, 10),
        createdAt: now,
        updatedAt: now,
      }
      sessions.set(session.inviteCode, session)
      return session
    },
    async resolveInvite(inviteCode) {
      return sessions.get(inviteCode) ?? null
    },
  }
}
