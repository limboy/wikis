/**
 * Only the renderer's own document may navigate inside the window. Links in
 * note content or source metadata must go to the system browser instead —
 * otherwise a single click replaces the app UI with a web page, and the window
 * has no chrome to get back from it.
 */
export function isRendererUrl(url: string, entryUrl: string): boolean {
  try {
    const target = new URL(url)
    const entry = new URL(entryUrl)
    if (entry.protocol === 'file:') {
      return target.protocol === 'file:' && target.pathname === entry.pathname
    }
    return target.origin === entry.origin
  } catch {
    return false
  }
}

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

/** Guards `shell.openExternal` so the OS never sees a `file:` or `javascript:` URL. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}
