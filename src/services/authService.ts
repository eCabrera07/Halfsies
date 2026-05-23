import type { AuthUser } from '../types'

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>
  signInWithGoogle(): Promise<AuthUser>
  signOut(): Promise<void>
}

export function createMockAuthService(): AuthService {
  let currentUser: AuthUser | null = null

  return {
    async getCurrentUser() {
      return currentUser
    },
    async signInWithGoogle() {
      currentUser = {
        id: 'google-user-1',
        email: 'guest@gmail.com',
        displayName: 'Guest',
      }
      return currentUser
    },
    async signOut() {
      currentUser = null
    },
  }
}
