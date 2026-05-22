# Collaborative Receipt Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the next Halfsies pass so hosts can share a durable session link, guests can sign in with Google, assign themselves to items, use dark mode, and benefit from stronger receipt image extraction.

**Architecture:** Keep the current React app as the client shell while moving shared session state to a backend persistence adapter. Preserve portable domain modules by keeping split math, OCR parsing, receipt types, and assignment permissions outside UI components.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, Zustand, Vitest, Google OAuth provider, hosted database/realtime service, OCR provider behind `OcrService`.

---

## File Structure

- Modify `src/types/index.ts` to add persisted session, auth user, roles, and OCR confidence types.
- Create `src/services/sessionService.ts` for session CRUD and invite-link resolution.
- Create `src/services/authService.ts` for Google sign-in and current-user lookup.
- Modify `src/services/ocrService.ts` to support provider implementations and OCR confidence metadata.
- Create `src/services/imagePreprocessor.ts` for receipt crop, deskew, and enhancement contracts.
- Create `src/store/useThemeStore.ts` for `light`, `dark`, and `system` modes.
- Modify `src/store/useTicketStore.ts` to separate local ticket edits from remote session synchronization.
- Create `src/utils/assignmentPermissions.ts` for host versus guest assignment rules.
- Create `src/utils/receiptParsers.ts` for strategy-based parsing of multiple receipt formats.
- Modify `src/components` to add session join, theme toggle, guest self-assignment, and capture confirmation UI.
- Add tests beside every new service or utility.

### Task 1: Session Data Contract

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/utils/assignmentPermissions.test.ts`
- Create: `src/utils/assignmentPermissions.ts`

- [ ] **Step 1: Write the failing permission tests**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/assignmentPermissions.test.ts`
Expected: FAIL because `assignmentPermissions.ts` does not exist.

- [ ] **Step 3: Add session and role types**

```ts
export type ParticipantRole = 'host' | 'guest'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

export interface TicketSession {
  id: string
  ticketId: string
  hostId: string
  inviteCode: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Add minimal permission implementation**

```ts
interface AssignmentPermissionInput {
  actorId: string
  hostId: string
  targetParticipantId: string
}

export function canAssignParticipantToItem(input: AssignmentPermissionInput): boolean {
  return input.actorId === input.hostId || input.actorId === input.targetParticipantId
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/utils/assignmentPermissions.test.ts`
Expected: PASS.

### Task 2: Google Auth Boundary

**Files:**
- Create: `src/services/authService.ts`
- Test: `src/services/authService.test.ts`

- [ ] **Step 1: Write the failing auth service tests**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/authService.test.ts`
Expected: FAIL because `authService.ts` does not exist.

- [ ] **Step 3: Add the auth boundary**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/authService.test.ts`
Expected: PASS.

### Task 3: Durable Shared Session Links

**Files:**
- Create: `src/services/sessionService.ts`
- Test: `src/services/sessionService.test.ts`
- Modify: `src/hooks/useShareResults.ts`

- [ ] **Step 1: Write the failing session service tests**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/sessionService.test.ts`
Expected: FAIL because `sessionService.ts` does not exist.

- [ ] **Step 3: Add the session service contract**

```ts
import type { TicketSession } from '../types'

interface CreateSessionInput {
  ticketId: string
  hostId: string
}

export interface SessionService {
  createSession(input: CreateSessionInput): Promise<TicketSession>
  resolveInvite(inviteCode: string): Promise<TicketSession | null>
}
```

- [ ] **Step 4: Add the in-memory implementation**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/services/sessionService.test.ts`
Expected: PASS.

### Task 4: Theme Store and Dark Mode

**Files:**
- Create: `src/store/useThemeStore.ts`
- Test: `src/store/useThemeStore.test.ts`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Write the failing theme store test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveTheme } from './useThemeStore'

describe('resolveTheme', () => {
  it('uses system preference only when mode is system', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('system', true)).toBe('dark')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/useThemeStore.test.ts`
Expected: FAIL because `useThemeStore.ts` does not exist.

- [ ] **Step 3: Add the theme store**

```ts
import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return mode
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
}))
```

- [ ] **Step 4: Add theme CSS tokens and toggle component**

Add CSS custom properties to `src/index.css`, apply a `dark` class on the root element in `src/App.tsx`, and add a compact icon toggle that cycles `system -> light -> dark -> system`.

- [ ] **Step 5: Run verification**

Run: `npm test -- src/store/useThemeStore.test.ts && npm run lint && npm run build`
Expected: PASS for tests, lint, and build.

### Task 5: Mobile Receipt Capture QA

**Files:**
- Modify: `src/components/CameraUploadView.tsx`
- Test: `src/components/CameraUploadView.test.tsx`

- [ ] **Step 1: Write the failing capture input test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CameraUploadView } from './CameraUploadView'

describe('CameraUploadView', () => {
  it('uses mobile file capture instead of webcam video', () => {
    render(<CameraUploadView />)
    const captureInput = screen.getByLabelText('Capture receipt', { selector: 'input' })

    expect(captureInput).toHaveAttribute('type', 'file')
    expect(captureInput).toHaveAttribute('accept', 'image/*')
    expect(captureInput).toHaveAttribute('capture', 'environment')
  })
})
```

- [ ] **Step 2: Run test to verify it fails or exposes missing accessibility**

Run: `npm test -- src/components/CameraUploadView.test.tsx`
Expected: FAIL if the file input cannot be selected by accessible label.

- [ ] **Step 3: Make capture input accessible and explicit**

Ensure the capture input has `aria-label="Capture receipt"` and no webcam/video stream code is introduced.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/CameraUploadView.test.tsx`
Expected: PASS.

### Task 6: Computer Vision Preprocessing Boundary

**Files:**
- Create: `src/services/imagePreprocessor.ts`
- Test: `src/services/imagePreprocessor.test.ts`
- Modify: `src/services/ocrService.ts`

- [ ] **Step 1: Write the failing preprocessor tests**

```ts
import { describe, expect, it } from 'vitest'
import { createNoopImagePreprocessor } from './imagePreprocessor'

describe('createNoopImagePreprocessor', () => {
  it('returns the original image while preserving the future computer vision contract', async () => {
    const preprocessor = createNoopImagePreprocessor()
    const image = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' })

    const result = await preprocessor.prepareReceiptImage(image)

    expect(result.image).toBe(image)
    expect(result.operations).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/imagePreprocessor.test.ts`
Expected: FAIL because `imagePreprocessor.ts` does not exist.

- [ ] **Step 3: Add preprocessing contract**

```ts
export interface PreparedReceiptImage {
  image: File | Blob | string
  operations: string[]
}

export interface ImagePreprocessor {
  prepareReceiptImage(image: File | string): Promise<PreparedReceiptImage>
}

export function createNoopImagePreprocessor(): ImagePreprocessor {
  return {
    async prepareReceiptImage(image) {
      return { image, operations: [] }
    },
  }
}
```

- [ ] **Step 4: Thread preprocessor into OCR flow**

Update OCR orchestration so the uploaded image can be preprocessed before calling the active OCR provider.

- [ ] **Step 5: Run verification**

Run: `npm test -- src/services/imagePreprocessor.test.ts && npm run lint && npm run build`
Expected: PASS for tests, lint, and build.

### Task 7: Receipt Parser Strategies

**Files:**
- Create: `src/utils/receiptParsers.ts`
- Test: `src/utils/receiptParsers.test.ts`
- Modify: `src/services/ocrService.ts`

- [ ] **Step 1: Write receipt fixture tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseReceiptTextWithStrategies } from './receiptParsers'

describe('parseReceiptTextWithStrategies', () => {
  it('parses quantity prefixes', () => {
    const items = parseReceiptTextWithStrategies('2 Tacos 18.00')
    expect(items[0]).toMatchObject({ name: 'Tacos', quantity: 2, totalPrice: 18 })
  })

  it('parses quantity suffixes', () => {
    const items = parseReceiptTextWithStrategies('Tacos x2 18.00')
    expect(items[0]).toMatchObject({ name: 'Tacos', quantity: 2, totalPrice: 18 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/receiptParsers.test.ts`
Expected: FAIL because `receiptParsers.ts` does not exist.

- [ ] **Step 3: Extract current parser into strategy utilities**

Move deterministic receipt text parsing out of `ocrService.ts` and into `receiptParsers.ts`, with separate helpers for prefix quantity, suffix quantity, total-line filtering, and currency extraction.

- [ ] **Step 4: Run parser and OCR tests**

Run: `npm test -- src/utils/receiptParsers.test.ts src/services/ocrService.test.ts`
Expected: PASS.

### Task 8: End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/FUTURE_PLANS.md`

- [ ] **Step 1: Document the new architecture**

Update README with backend, auth, realtime, dark mode, capture, and OCR integration instructions.

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: all tests pass.

Run: `npm run lint`
Expected: no lint errors.

Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Commit**

```bash
git add README.md docs src package.json package-lock.json
git commit -m "docs: plan collaborative receipt splitting"
```
