import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { KnowledgeEntry } from '../renderer/src/data/types'
import type { DbAPI } from './index.d'

// Custom DB APIs for renderer
const api: { db: DbAPI } = {
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
