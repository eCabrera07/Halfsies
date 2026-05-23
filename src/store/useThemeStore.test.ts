import { describe, expect, it } from 'vitest'
import { resolveTheme } from './useThemeStore'

describe('resolveTheme', () => {
  it('uses system preference only when mode is system', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
