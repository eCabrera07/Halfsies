import { describe, expect, it } from 'vitest'
import { createInMemorySessionService } from './sessionService'

describe('createInMemorySessionService', () => {
  it('creates and resolves invite links by code', async () => {
    const service = createInMemorySessionService()
    const session = await service.createSession({ ticketId: 'ticket-1', hostId: 'host-1' })

    expect(session.inviteCode).toHaveLength(10)
    await expect(service.resolveInvite(session.inviteCode)).resolves.toEqual(session)
  })
})
