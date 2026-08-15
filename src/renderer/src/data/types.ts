export type {
  KnowledgeEntry,
  KnowledgeType,
  RelatedLink,
  RelationType,
  Source,
  SourceType
} from '../../../shared/types'

import type { KnowledgeEntry, KnowledgeType, RelationType } from '../../../shared/types'

export interface BackLink {
  sourceId: string
  type: RelationType
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
  question: '问题'
}
