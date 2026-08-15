import type { JSX } from 'react'
import { Lightbulb, BookOpen, MessageSquare, Boxes } from 'lucide-react'
import { KnowledgeType } from '@/data/types'

// Small presentational helpers shared between the sidebar list and the
// search overlay, so both render knowledge entries the same way.

export const typeColorClasses: Record<KnowledgeType, string> = {
  concept: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  viewpoint: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  narrative: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  entity: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
}

export function getTypeIcon(type: KnowledgeType): JSX.Element {
  switch (type) {
    case 'concept':
      return <Lightbulb className="size-3 shrink-0" />
    case 'viewpoint':
      return <MessageSquare className="size-3 shrink-0" />
    case 'narrative':
      return <BookOpen className="size-3 shrink-0" />
    case 'entity':
      return <Boxes className="size-3 shrink-0" />
  }
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  // Handle future dates or dates created today
  if (diffMs <= 0) return '今天'

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`
  return `${Math.floor(diffDays / 365)} 年前`
}
