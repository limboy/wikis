import { useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  KnowledgeEntryWithBacklinks,
  KnowledgeType,
  KNOWLEDGE_TYPE_LABELS
} from '@/data/types'
import { getEntryById } from '@/data/utils'
import { Button } from '@/components/ui/button'

interface NotePaneProps {
  entry: KnowledgeEntryWithBacklinks
  paneIndex: number
  totalPanes: number
  isHighlighted?: boolean
  onOpenNote: (noteId: string, fromIndex: number) => void
  onClose: (index: number) => void
}

const typeColorClasses: Record<KnowledgeType, string> = {
  concept: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  story: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  event: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  excerpt: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  general: 'bg-muted text-muted-foreground'
}

export function NotePane({
  entry,
  paneIndex,
  totalPanes,
  isHighlighted,
  onOpenNote,
  onClose
}: NotePaneProps) {
  const paneRef = useRef<HTMLDivElement>(null)

  const relatedIds = Array.from(new Set(entry.related?.map((l) => l.targetId) || []))
  const backlinkIds = Array.from(new Set(entry.backlinks?.map((l) => l.sourceId) || []))

  const hasSource = Boolean(entry.source)
  const hasRelated = relatedIds.length > 0
  const hasBacklinks = backlinkIds.length > 0
  const hasBottomSection = hasSource || hasRelated || hasBacklinks

  return (
    <div
      ref={paneRef}
      className={cn(
        'flex-shrink-0 w-[600px] h-full flex flex-col bg-card text-card-foreground border-r border-border transition-all duration-300 animate-in slide-in-from-right-4 fade-in duration-200',
        isHighlighted && 'ring-2 ring-primary border-primary/80 z-10 shadow-lg'
      )}
    >
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold leading-tight">{entry.title}</h1>
              <span
                className={cn(
                  'self-start px-2 py-0.5 rounded text-xs font-medium',
                  typeColorClasses[entry.type]
                )}
              >
                {KNOWLEDGE_TYPE_LABELS[entry.type]}
              </span>
            </div>
            {totalPanes > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => onClose(paneIndex)}>
                <X />
              </Button>
            )}
          </div>

          {/* One-liner */}
          <div className="text-[15px] font-medium text-foreground/80 border-l-[3px] border-primary/60 pl-4 py-0.5 leading-relaxed">
            {entry.oneLiner}
          </div>

          {/* What it is */}
          {entry.whatItIs && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                它是怎么回事
              </h2>
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-[1.8]">
                {entry.whatItIs}
              </div>
            </section>
          )}

          {/* Why it matters */}
          {entry.whyItMatters && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                为什么重要
              </h2>
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-[1.8]">
                {entry.whyItMatters}
              </div>
            </section>
          )}

          {/* Deep dive */}
          {entry.deepDive && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                深入了解
              </h2>
              <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-[1.8]">
                {entry.deepDive}
              </div>
            </section>
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

function RelatedCard({ noteId, onClick }: { noteId: string; onClick: () => void }) {
  const targetEntry = getEntryById(noteId)
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
