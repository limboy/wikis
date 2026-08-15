import { type JSX } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KnowledgeEntryWithBacklinks, KnowledgeType, KNOWLEDGE_TYPE_LABELS } from '@/data/types'
import { getEntryById } from '@/data/utils'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

interface NotePaneProps {
  entry: KnowledgeEntryWithBacklinks
  allEntries: KnowledgeEntryWithBacklinks[]
  paneIndex: number
  onOpenNote: (noteId: string, fromIndex: number) => void
  onClose: (index: number) => void
}

const typeColorClasses: Record<KnowledgeType, string> = {
  concept: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  viewpoint: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  narrative: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  entity: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
}

export function NotePane({
  entry,
  allEntries,
  paneIndex,
  onOpenNote,
  onClose
}: NotePaneProps): JSX.Element {
  const relatedIds = Array.from(new Set(entry.related?.map((l) => l.targetId) || []))
  const backlinkIds = Array.from(new Set(entry.backlinks?.map((l) => l.sourceId) || []))

  // The one-liner leads the body as its own section so it picks up the same
  // heading and prose styling as the rest of the note.
  const body = [entry.oneLiner ? `## 一句话概述\n\n${entry.oneLiner}` : '', entry.content || '']
    .filter(Boolean)
    .join('\n\n')

  const hasSource = Boolean(entry.source)
  const hasRelated = relatedIds.length > 0
  const hasBacklinks = backlinkIds.length > 0
  const hasBottomSection = hasSource || hasRelated || hasBacklinks

  return (
    <div
      className="flex-shrink-0 w-[600px] h-full flex flex-col bg-card text-card-foreground border-r border-border animate-in slide-in-from-right-4 fade-in duration-200"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Draggable title bar */}
      <div
        className="h-[44px] flex-shrink-0 flex items-center justify-between gap-3 px-4 border-b border-border"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <h1 className="text-lg font-semibold leading-tight truncate">{entry.title}</h1>
        <div
          className="flex-shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button variant="ghost" size="icon-sm" onClick={() => onClose(paneIndex)}>
            <X />
          </Button>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {/* Main Content */}
          {body && (
            <div className="text-base leading-relaxed">
              <MarkdownRenderer content={body} />
            </div>
          )}

          {/* Bottom Section: 来源, 相关内容, 被引用 */}
          {hasBottomSection && (
            <div className="flex flex-col gap-5 pt-4 border-t border-border/60">
              {/* 来源 */}
              {hasSource && entry.source && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    来源
                  </h3>
                  <button
                    onClick={() => onOpenNote(`source:${entry.source!.title}`, paneIndex)}
                    className="group flex items-center justify-between gap-3 bg-muted/40 hover:bg-accent/60 border border-border/60 hover:border-primary/40 rounded-xl p-3.5 transition-all text-left cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex flex-col gap-0.5 text-sm min-w-0">
                      <span className="font-semibold text-foreground group-hover:text-primary truncate transition-colors">
                        {entry.source.title}
                      </span>
                      {entry.source.author && (
                        <span className="text-muted-foreground text-xs">{entry.source.author}</span>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>
              )}

              {/* 相关内容 */}
              {hasRelated && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    相关内容
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {relatedIds.map((targetId) => (
                      <RelatedCard
                        key={targetId}
                        noteId={targetId}
                        allEntries={allEntries}
                        onClick={() => onOpenNote(targetId, paneIndex)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 被引用 */}
              {hasBacklinks && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    被引用
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {backlinkIds.map((sourceId) => (
                      <RelatedCard
                        key={sourceId}
                        noteId={sourceId}
                        allEntries={allEntries}
                        onClick={() => onOpenNote(sourceId, paneIndex)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RelatedCard({
  noteId,
  allEntries,
  onClick
}: {
  noteId: string
  allEntries: KnowledgeEntryWithBacklinks[]
  onClick: () => void
}): JSX.Element {
  const targetEntry = getEntryById(noteId, allEntries)
  if (!targetEntry) {
    return (
      <button
        onClick={onClick}
        className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 text-left transition-all"
      >
        <span className="text-sm font-medium text-foreground">{noteId}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-1.5 p-3.5 rounded-xl border border-border/70 bg-muted/30 hover:bg-accent/50 hover:border-primary/40 transition-all text-left shadow-2xs hover:shadow-xs cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {targetEntry.title}
        </span>
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
            typeColorClasses[targetEntry.type]
          )}
        >
          {KNOWLEDGE_TYPE_LABELS[targetEntry.type]}
        </span>
      </div>
      {targetEntry.oneLiner && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {targetEntry.oneLiner}
        </p>
      )}
    </button>
  )
}
