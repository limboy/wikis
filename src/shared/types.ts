/**
 * The knowledge entry model, shared by the main process, the preload bridge and
 * the renderer. This is the single definition — keeping separate copies per
 * process let them drift apart silently.
 */

export type KnowledgeType = 'concept' | 'viewpoint' | 'narrative' | 'entity'

export type RelationType = 'derived_from' | 'requires' | 'related_to' | 'contrasts_with' | 'part_of'

export type SourceType = 'book' | 'article' | 'video' | 'podcast' | 'conversation' | 'personal'

export interface RelatedLink {
  targetId: string
  type: RelationType
}

export interface Source {
  type: SourceType
  title: string
  author?: string
  url?: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  type: KnowledgeType

  // Standard Sections
  oneLiner: string // 一句话解释
  content?: string // 详细内容 / 正文

  // Metadata
  source?: Source

  // Outgoing links; backlinks are computed from these at runtime
  related: RelatedLink[]

  tags: string[]
  createdAt: string // ISO date
  updatedAt: string
}

/**
 * App-level preferences, distinct from knowledge data. Persisted by the main
 * process and shared with the renderer over IPC.
 */
export type AppearanceMode = 'system' | 'light' | 'dark'

export interface AppSettings {
  appearance: AppearanceMode
  /** Absolute path to the directory the SQLite database currently lives in. */
  dataDir: string
  /** What `dataDir` resolves to when the user hasn't overridden it. */
  defaultDataDir: string
  isDefaultDataDir: boolean
}
