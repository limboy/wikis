import { useState, type JSX } from 'react'
import { Lightbulb, BookOpen, MessageSquare, Sparkles, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KnowledgeEntryWithBacklinks, KnowledgeType, KNOWLEDGE_TYPE_LABELS } from '@/data/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type SortMode = 'newest' | 'shuffle'

interface KnowledgeSidebarProps {
  entries: KnowledgeEntryWithBacklinks[]
  activeNoteIds: string[]
  onSelectEntry: (id: string) => void
  sortMode: SortMode
  onSortModeChange: (mode: SortMode) => void
}

const typeColorClasses: Record<KnowledgeType, string> = {
  concept: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  viewpoint: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  narrative: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  reflection: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
}

function getTypeIcon(type: KnowledgeType): JSX.Element {
  switch (type) {
    case 'concept':
      return <Lightbulb className="size-3 shrink-0" />
    case 'viewpoint':
      return <MessageSquare className="size-3 shrink-0" />
    case 'narrative':
      return <BookOpen className="size-3 shrink-0" />
    case 'reflection':
      return <Sparkles className="size-3 shrink-0" />
  }
}

function formatRelativeDate(dateStr: string): string {
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

const TYPE_FILTER_OPTIONS: Array<{ key: KnowledgeType | 'all'; label: string }> = [
  { key: 'all', label: '不限' },
  { key: 'concept', label: '概念' },
  { key: 'viewpoint', label: '观点' },
  { key: 'narrative', label: '叙事' },
  { key: 'reflection', label: '感悟' }
]

export function KnowledgeSidebar({
  entries,
  activeNoteIds,
  onSelectEntry,
  sortMode,
  onSortModeChange
}: KnowledgeSidebarProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<KnowledgeType | 'all'>('all')

  const handleShuffleClick = (): void => {
    onSortModeChange(sortMode === 'shuffle' ? 'newest' : 'shuffle')
  }

  const filteredEntries =
    selectedType === 'all' ? entries : entries.filter((e) => e.type === selectedType)

  return (
    <div className="w-[280px] h-full flex flex-col border-r border-border bg-background flex-shrink-0">
      {/* Header with Select & Count */}
      <div
        className="pt-[44px] pb-3 px-4 flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="flex items-center justify-between w-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-1">
            <h1 className="font-bold text-lg tracking-tight px-1.5">Wikis</h1>
            <button
              type="button"
              onClick={handleShuffleClick}
              aria-pressed={sortMode === 'shuffle'}
              title="Shuffle"
              className={cn(
                'flex items-center justify-center size-7 rounded-md cursor-pointer transition-colors',
                sortMode === 'shuffle'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Shuffle className="size-3.5" />
            </button>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {filteredEntries.length}
          </span>
        </div>
      </div>

      {/* Shadcn Tabs Segment Filter */}
      <div className="px-4 pb-3">
        <Tabs
          value={selectedType}
          onValueChange={(val) => setSelectedType(val as KnowledgeType | 'all')}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-5 h-8 p-0.5 bg-muted/60 rounded-lg">
            {TYPE_FILTER_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.key}
                value={option.key}
                className="text-[11px] font-medium px-1 py-1 rounded-md cursor-pointer transition-all data-active:bg-background data-active:text-foreground data-active:shadow-2xs"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">暂无符合条件的条目</div>
          ) : (
            filteredEntries.map((entry) => {
              const isActive = activeNoteIds.includes(entry.id)
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    window.api.menu.showWikiItemContextMenu(entry.id)
                  }}
                  className={cn(
                    'flex flex-col gap-1 px-4 py-3 border-b border-border/40 text-left transition-colors cursor-pointer',
                    'hover:bg-accent/50',
                    isActive && 'bg-accent'
                  )}
                >
                  <div className="font-medium text-sm line-clamp-1">{entry.title}</div>
                  {entry.oneLiner && (
                    <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {entry.oneLiner}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
                        typeColorClasses[entry.type]
                      )}
                    >
                      {getTypeIcon(entry.type)}
                      {KNOWLEDGE_TYPE_LABELS[entry.type]}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatRelativeDate(entry.createdAt)}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
