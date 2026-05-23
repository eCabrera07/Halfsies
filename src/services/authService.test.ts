import { describe, expect, it } from 'vitest'
import { createMockAuthService } from './authService'

describe('createMockAuthService', () => {
  it('returns a Google-style user for local development', async () => {
    const auth = createMockAuthService()
    const user = await auth.signInWithGoogle()

    expect(user.email).toContain('@gmail.com')
    expect(user.displayName).toBeTruthy()
  })
})
