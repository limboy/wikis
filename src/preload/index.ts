import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom DB APIs for renderer
const api = {
  db: {
    getAllEntries: () => ipcRenderer.invoke('db:getAllEntries'),
    getEntryById: (id: string) => ipcRenderer.invoke('db:getEntryById', id),
    createEntry: (entry: any) => ipcRenderer.invoke('db:createEntry', entry),
    updateEntry: (id: string, entry: any) => ipcRenderer.invoke('db:updateEntry', id, entry),
    deleteEntry: (id: string) => ipcRenderer.invoke('db:deleteEntry', id)
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
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
