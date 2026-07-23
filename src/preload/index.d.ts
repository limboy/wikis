import { ElectronAPI } from '@electron-toolkit/preload'
import { KnowledgeEntry } from '../renderer/src/data/types'

export interface DbAPI {
  getAllEntries: () => Promise<KnowledgeEntry[]>
  getEntryById: (id: string) => Promise<KnowledgeEntry | null>
  createEntry: (entry: KnowledgeEntry) => Promise<KnowledgeEntry>
  updateEntry: (id: string, entry: KnowledgeEntry) => Promise<KnowledgeEntry>
  deleteEntry: (id: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: DbAPI
    }
  }
}
