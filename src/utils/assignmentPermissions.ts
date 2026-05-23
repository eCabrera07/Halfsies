interface AssignmentPermissionInput {
  actorId: string
  hostId: string
  targetParticipantId: string
}

export function canAssignParticipantToItem(input: AssignmentPermissionInput): boolean {
  return input.actorId === input.hostId || input.actorId === input.targetParticipantId
}
