export type KnowledgeType = 'concept' | 'viewpoint' | 'narrative' | 'reflection'

export type RelationType =
  | 'derived_from'
  | 'requires'
  | 'related_to'
  | 'contrasts_with'
  | 'part_of'

export interface RelatedLink {
  targetId: string
  type: RelationType
}

export interface BackLink {
  sourceId: string
  type: RelationType
}

export interface Source {
  type: 'book' | 'article' | 'video' | 'podcast' | 'conversation' | 'personal'
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

  // Bi-directional Links
  related: RelatedLink[]

  tags: string[]
  createdAt: string // ISO date
  updatedAt: string
}

// Computed at runtime
export interface KnowledgeEntryWithBacklinks extends KnowledgeEntry {
  backlinks: BackLink[]
}

export const RELATION_LABELS: Record<RelationType, string> = {
  derived_from: '衍生自',
  requires: '前置知识',
  related_to: '相关',
  contrasts_with: '对比',
  part_of: '隶属于'
}

export const RELATION_REVERSE_LABELS: Record<RelationType, string> = {
  derived_from: '衍生出',
  requires: '被依赖于',
  related_to: '相关',
  contrasts_with: '对比',
  part_of: '包含'
}

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  concept: '概念',
  viewpoint: '观点',
  narrative: '叙事',
  reflection: '感悟'
}
