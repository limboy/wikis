import { KnowledgeEntry } from './types'

export const fallbackKnowledgeEntries: KnowledgeEntry[] = []

export async function fetchKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  if (typeof window !== 'undefined' && window.api?.db) {
    try {
      const entries = await window.api.db.getAllEntries()
      if (entries) {
        return entries
      }
    } catch (error) {
      console.error('[Renderer] Error fetching entries from SQLite DB:', error)
    }
  }
  return []
}

export async function createKnowledgeEntry(entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.createEntry(entry)
  }
  return entry
}

export async function updateKnowledgeEntry(id: string, entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.updateEntry(id, entry)
  }
  return entry
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.api?.db) {
    return await window.api.db.deleteEntry(id)
  }
  return false
}

export const knowledgeEntries: KnowledgeEntry[] = []
