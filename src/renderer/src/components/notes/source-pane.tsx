import { type JSX } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Source,
  KnowledgeType,
  KNOWLEDGE_TYPE_LABELS,
  KnowledgeEntryWithBacklinks
} from '@/data/types'
import { Button } from '@/components/ui/button'

interface SourcePaneProps {
  source: Source
  entries: KnowledgeEntryWithBacklinks[]
  paneIndex: number
  onOpenNote: (noteId: string, fromIndex: number) => void
  onClose: (index: number) => void
}

const typeColorClasses: Record<KnowledgeType, string> = {
  concept: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  viewpoint: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  narrative: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  question: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
}

export function SourcePane({
  source,
  entries,
  paneIndex,
  onOpenNote,
  onClose
}: SourcePaneProps): JSX.Element {
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
        <h1 className="text-xl font-bold leading-tight truncate">{source.title}</h1>
        <div
          className="flex-shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button variant="ghost" size="icon-sm" onClick={() => onClose(paneIndex)}>
            <X />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {source.author && (
            <span className="text-sm text-muted-foreground font-medium">{source.author}</span>
          )}

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
