import { KnowledgeEntry, KnowledgeEntryWithBacklinks, BackLink } from './types'
import { knowledgeEntries, fetchKnowledgeEntries } from './knowledge-base'

// Build backlinks map from the knowledge entries
export function buildBacklinks(entries: KnowledgeEntry[]): Map<string, BackLink[]> {
  const map = new Map<string, BackLink[]>()
  entries.forEach((entry) => map.set(entry.id, []))

  entries.forEach((entry) => {
    entry.related.forEach((link) => {
      const backlinks = map.get(link.targetId)
      if (backlinks) {
        backlinks.push({
          sourceId: entry.id,
          type: link.type
        })
      }
    })
  })
  return map
}

// Attach computed backlinks to a set of entries
export function attachBacklinksToEntries(entries: KnowledgeEntry[]): KnowledgeEntryWithBacklinks[] {
  const backlinksMap = buildBacklinks(entries)
  return entries.map((entry) => ({
    ...entry,
    backlinks: backlinksMap.get(entry.id) || []
  }))
}

// Get all entries with computed backlinks asynchronously
export async function getEntriesWithBacklinksAsync(): Promise<KnowledgeEntryWithBacklinks[]> {
  const entries = await fetchKnowledgeEntries()
  return attachBacklinksToEntries(entries)
}

// Get all entries with computed backlinks (synchronous fallback)
export function getEntriesWithBacklinks(): KnowledgeEntryWithBacklinks[] {
  const backlinksMap = buildBacklinks(knowledgeEntries)
  return knowledgeEntries.map((entry) => ({
    ...entry,
    backlinks: backlinksMap.get(entry.id) || []
  }))
}

// Get a single entry by ID with backlinks
export function getEntryById(id: string): KnowledgeEntryWithBacklinks | undefined {
  const entries = getEntriesWithBacklinks()
  return entries.find((e) => e.id === id)
}

// Get entries sharing the same source
export function getEntriesBySameSource(
  currentEntry: KnowledgeEntry
): KnowledgeEntryWithBacklinks[] {
  if (!currentEntry.source?.title) return []
  const all = getEntriesWithBacklinks()
  return all.filter(
    (e) => e.id !== currentEntry.id && e.source?.title === currentEntry.source?.title
  )
}

// Get source metadata and entries belonging to that source by title
export function getSourceDataByTitle(title: string) {
  const all = getEntriesWithBacklinks()
  const matchingEntries = all.filter((e) => e.source?.title === title)
  if (matchingEntries.length === 0) return undefined
  const source = matchingEntries[0].source!
  return {
    source,
    entries: matchingEntries
  }
}

// Sort entries by creation date (newest first)
export function sortByDate(entries: KnowledgeEntryWithBacklinks[]): KnowledgeEntryWithBacklinks[] {
  return [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Shuffle entries (Fisher-Yates)
export function shuffleEntries(entries: KnowledgeEntryWithBacklinks[]): KnowledgeEntryWithBacklinks[] {
  const result = [...entries]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
