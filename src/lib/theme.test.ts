import { describe, expect, it } from 'vitest'
import { DEFAULT_MODE, DEFAULT_THEME, isThemeId, isThemeMode, resolveMode } from './theme'

describe('theme', () => {
  it('resolves the system preference', () => {
    expect(resolveMode('system', true)).toBe('dark')
    expect(resolveMode('system', false)).toBe('light')
    expect(resolveMode('light', true)).toBe('light')
    expect(resolveMode('dark', false)).toBe('dark')
  })

  it('accepts only the bundled themes', () => {
    expect(isThemeId('shelf')).toBe(true)
    expect(isThemeId('diary')).toBe(true)
    expect(isThemeId('leopard')).toBe(true)
    expect(isThemeId('leopard-pink')).toBe(true)
    expect(isThemeId('classic')).toBe(false)
    expect(isThemeId(undefined)).toBe(false)
  })

  it('accepts only the three modes', () => {
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('system')).toBe(true)
    expect(isThemeMode('auto')).toBe(false)
  })

  it('has a safe default', () => {
    expect(DEFAULT_THEME).toBe('shelf')
    expect(DEFAULT_MODE).toBe('light')
  })
})
