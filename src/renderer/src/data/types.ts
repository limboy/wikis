export type KnowledgeType = 'concept' | 'story' | 'event' | 'excerpt' | 'general'

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
  whatItIs: string // 它是怎么回事
  whyItMatters: string // 为什么重要
  deepDive: string // 深入了解

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
  story: '故事',
  event: '事件',
  excerpt: '摘录',
  general: '笔记'
}
