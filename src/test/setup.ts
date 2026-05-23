import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
