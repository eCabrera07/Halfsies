import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock URL.createObjectURL
if (typeof globalThis.URL.createObjectURL === 'undefined') {
  globalThis.URL.createObjectURL = vi.fn(() => 'mock-url')
}
