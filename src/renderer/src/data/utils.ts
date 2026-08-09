import { KnowledgeEntry, KnowledgeEntryWithBacklinks, BackLink, Source } from './types'
import { fetchKnowledgeEntries } from './knowledge-base'

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

// Get all entries with computed backlinks
export async function getEntriesWithBacklinksAsync(): Promise<KnowledgeEntryWithBacklinks[]> {
  const entries = await fetchKnowledgeEntries()
  return attachBacklinksToEntries(entries)
}

// Get a single entry by ID
export function getEntryById(
  id: string,
  allEntries: KnowledgeEntryWithBacklinks[]
): KnowledgeEntryWithBacklinks | undefined {
  return allEntries.find((e) => e.id === id)
}

// Get source metadata and entries belonging to that source by title
export function getSourceDataByTitle(
  title: string,
  allEntries: KnowledgeEntryWithBacklinks[]
): { source: Source; entries: KnowledgeEntryWithBacklinks[] } | undefined {
  const matchingEntries = allEntries.filter((e) => e.source?.title === title)
  if (matchingEntries.length === 0) return undefined
  return {
    source: matchingEntries[0].source!,
    entries: matchingEntries
  }
}

// Sort entries by creation date (newest first)
export function sortByDate(entries: KnowledgeEntryWithBacklinks[]): KnowledgeEntryWithBacklinks[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Deterministic PRNG (mulberry32) so a given seed always yields the same order
function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shuffle entries (Fisher-Yates). The seed keeps the order stable across
// re-renders and database refreshes; pass a new seed to reshuffle.
export function shuffleEntries(
  entries: KnowledgeEntryWithBacklinks[],
  seed = Date.now()
): KnowledgeEntryWithBacklinks[] {
  const random = createRandom(seed)
  const result = [...entries]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
