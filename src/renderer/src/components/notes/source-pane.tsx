import { useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Source, KnowledgeType, KNOWLEDGE_TYPE_LABELS, KnowledgeEntryWithBacklinks } from '@/data/types'
import { Button } from '@/components/ui/button'

interface SourcePaneProps {
  source: Source
  entries: KnowledgeEntryWithBacklinks[]
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

export function SourcePane({
  source,
  entries,
  paneIndex,
  totalPanes,
  isHighlighted,
  onOpenNote,
  onClose
}: SourcePaneProps) {
  const paneRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={paneRef}
      className={cn(
        'flex-shrink-0 w-[600px] h-full flex flex-col bg-card text-card-foreground border-r border-border transition-all duration-300 animate-in slide-in-from-right-4 fade-in duration-200',
        isHighlighted && 'ring-2 ring-primary border-primary/80 z-10 shadow-lg'
      )}
    >
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-bold leading-tight">
                {source.title}
              </h1>
              {source.author && (
                <span className="text-sm text-muted-foreground font-medium">
                  {source.author}
                </span>
              )}
            </div>
            {totalPanes > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => onClose(paneIndex)}>
                <X />
              </Button>
            )}
          </div>

          {source.url && (
            <div>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm font-medium"
              >
                查看原始链接
                <ExternalLink className="size-4" />
              </a>
            </div>
          )}

          {/* Section: 出自此来源的内容 */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              出自此来源的内容 ({entries.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onOpenNote(entry.id, paneIndex)}
                  className="group flex flex-col gap-1.5 p-3.5 rounded-xl border border-border/70 bg-muted/30 hover:bg-accent/50 hover:border-primary/40 transition-all text-left shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {entry.title}
                    </span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
                        typeColorClasses[entry.type]
                      )}
                    >
                      {KNOWLEDGE_TYPE_LABELS[entry.type]}
                    </span>
                  </div>
                  {entry.oneLiner && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {entry.oneLiner}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
