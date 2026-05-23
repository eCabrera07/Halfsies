import { describe, expect, it } from 'vitest'
import { canAssignParticipantToItem } from './assignmentPermissions'

describe('canAssignParticipantToItem', () => {
  it('allows hosts to assign any participant', () => {
    expect(canAssignParticipantToItem({ actorId: 'host-1', hostId: 'host-1', targetParticipantId: 'guest-1' })).toBe(true)
  })

  it('allows guests to assign only themselves', () => {
    expect(canAssignParticipantToItem({ actorId: 'guest-1', hostId: 'host-1', targetParticipantId: 'guest-1' })).toBe(true)
    expect(canAssignParticipantToItem({ actorId: 'guest-1', hostId: 'host-1', targetParticipantId: 'guest-2' })).toBe(false)
  })
})
