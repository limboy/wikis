import { ElectronAPI } from '@electron-toolkit/preload'
import { AppearanceMode, AppSettings, KnowledgeEntry } from '../shared/types'

export interface DbAPI {
  getAllEntries: () => Promise<KnowledgeEntry[]>
  getEntryById: (id: string) => Promise<KnowledgeEntry | null>
  createEntry: (entry: KnowledgeEntry) => Promise<KnowledgeEntry>
  updateEntry: (id: string, entry: KnowledgeEntry) => Promise<KnowledgeEntry>
  deleteEntry: (id: string) => Promise<boolean>
  onUpdated: (callback: () => void) => () => void
}

export type SetDataLocationResult = { ok: true } | { ok: false; error: string }

export interface SettingsAPI {
  get: () => Promise<AppSettings>
  setAppearance: (mode: AppearanceMode) => Promise<AppSettings>
  chooseDataDirectory: () => Promise<string | null>
  setDataLocation: (options: {
    dir: string
    moveExisting: boolean
  }) => Promise<SetDataLocationResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: DbAPI
      settings: SettingsAPI
    }
  }
}
