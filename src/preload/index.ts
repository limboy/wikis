import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppearanceMode, AppSettings, KnowledgeEntry } from '../shared/types'
import type { DbAPI, MenuAPI, SettingsAPI } from './index.d'

// Applied synchronously, before the page's own scripts run, so the window
// never paints the light theme first and then flips to dark. main.tsx's
// settings fetch is async (an IPC round trip after module evaluation), which
// is late enough to show as a white flash on every restart when the saved
// appearance is dark. `document.documentElement` already exists by the time
// preload runs (Electron preload timing matches a document-start content
// script), so this beats first paint.
try {
  const settings = ipcRenderer.sendSync('settings:getSync') as AppSettings
  const isDark =
    settings.appearance === 'dark' ||
    (settings.appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
} catch (error) {
  console.error('[preload] Failed to apply initial appearance:', error)
}

// Custom DB and settings APIs for renderer
const api: { db: DbAPI; settings: SettingsAPI; menu: MenuAPI } = {
  db: {
    getAllEntries: () => ipcRenderer.invoke('db:getAllEntries'),
    getEntryById: (id: string) => ipcRenderer.invoke('db:getEntryById', id),
    createEntry: (entry: KnowledgeEntry) => ipcRenderer.invoke('db:createEntry', entry),
    updateEntry: (id: string, entry: KnowledgeEntry) =>
      ipcRenderer.invoke('db:updateEntry', id, entry),
    deleteEntry: (id: string) => ipcRenderer.invoke('db:deleteEntry', id),
    onUpdated: (callback: () => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('db:updated', listener)
      return () => {
        ipcRenderer.removeListener('db:updated', listener)
      }
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setAppearance: (mode: AppearanceMode) => ipcRenderer.invoke('settings:setAppearance', mode),
    chooseDataDirectory: () => ipcRenderer.invoke('settings:chooseDataDirectory'),
    dirHasDatabase: (dir: string) => ipcRenderer.invoke('settings:dirHasDatabase', dir),
    setDataLocation: (dir: string) => ipcRenderer.invoke('settings:setDataLocation', dir),
    onAppearanceChanged: (callback: (mode: AppearanceMode) => void) => {
      const listener = (_: unknown, mode: AppearanceMode): void => callback(mode)
      ipcRenderer.on('appearance:updated', listener)
      return () => {
        ipcRenderer.removeListener('appearance:updated', listener)
      }
    }
  },
  menu: {
    showWikiItemContextMenu: (id: string) => ipcRenderer.send('menu:showWikiItemContextMenu', id)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
