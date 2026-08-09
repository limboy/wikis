import { KnowledgeEntry } from './types'

export async function fetchKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  if (typeof window !== 'undefined' && window.api?.db) {
    try {
      return (await window.api.db.getAllEntries()) ?? []
    } catch (error) {
      console.error('[Renderer] Error fetching entries from SQLite DB:', error)
    }
  }
  return []
}
