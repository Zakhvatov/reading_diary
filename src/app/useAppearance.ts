import { useEffect } from 'react'
import { applyAppearance, type ThemeId, type ThemeMode } from '@/lib/theme'

/**
 * Пишет выбранную тему в <html> и следит за системной схемой,
 * когда выбран режим «как в системе».
 */
export function useApplyAppearance(theme: ThemeId | undefined, mode: ThemeMode | undefined) {
  useEffect(() => {
    if (!theme || !mode) return

    applyAppearance(theme, mode)
    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyAppearance(theme, 'system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme, mode])
}
