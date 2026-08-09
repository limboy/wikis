import type { AppearanceMode } from '../../../shared/types'

let systemQuery: MediaQueryList | null = null
let systemListener: ((event: MediaQueryListEvent) => void) | null = null

function resolveIsDark(mode: AppearanceMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function setDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * Toggles the `.dark` class the app's CSS keys off of. When `mode` is
 * "system" this also stays subscribed to OS theme changes so flipping
 * appearance in System Settings updates the app live, no restart needed.
 */
export function applyAppearance(mode: AppearanceMode): void {
  setDarkClass(resolveIsDark(mode))

  if (systemQuery && systemListener) {
    systemQuery.removeEventListener('change', systemListener)
    systemQuery = null
    systemListener = null
  }

  if (mode === 'system') {
    systemQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemListener = (event) => setDarkClass(event.matches)
    systemQuery.addEventListener('change', systemListener)
  }
}
