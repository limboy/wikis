import { useRef } from 'react'
import { X, ChevronRight, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  KnowledgeEntryWithBacklinks,
  KnowledgeType,
  KNOWLEDGE_TYPE_LABELS
} from '@/data/types'
import { getEntryById } from '@/data/utils'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

interface NotePaneProps {
  entry: KnowledgeEntryWithBacklinks
  paneIndex: number
  totalPanes: number
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

const SECTION_TITLES: Record<
  KnowledgeType,
  { whatItIs: string; whyItMatters: string; deepDive: string }
> = {
  concept: {
    whatItIs: '概念定义与机制',
    whyItMatters: '为什么重要',
    deepDive: '深入剖析'
  },
  story: {
    whatItIs: '故事经过',
    whyItMatters: '核心启发',
    deepDive: '现实映射与应用'
  },
  event: {
    whatItIs: '事件过程与脉络',
    whyItMatters: '关键影响',
    deepDive: '深层驱动力'
  },
  excerpt: {
    whatItIs: '原文摘录',
    whyItMatters: '记录与触动理由',
    deepDive: '重述与延伸思考'
  },
  general: {
    whatItIs: '思考记录',
    whyItMatters: '记录初衷',
    deepDive: '后续探究'
  }
}

export function NotePane({ entry, paneIndex, totalPanes, onOpenNote, onClose }: NotePaneProps) {
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
      className="flex-shrink-0 w-[600px] h-full flex flex-col bg-card text-card-foreground border-r border-border animate-in slide-in-from-right-4 fade-in duration-200"
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

          {/* Main Content Sections (Tailored by Type) */}
          {entry.type === 'excerpt' ? (
            /* Dedicated Excerpt / Quote Template */
            <>
              {/* Featured Quote Box */}
              {entry.whatItIs && (
                <div className="relative my-1 p-5 rounded-r-xl border-l-4 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <Quote className="size-4 shrink-0" />
                    <span>原文摘录</span>
                  </div>
                  <MarkdownRenderer
                    content={entry.whatItIs}
                    className="text-[15px] sm:text-base font-serif italic text-foreground/95 leading-relaxed pl-1"
                  />
                </div>
              )}

              {/* 记录与触动理由 */}
              {entry.whyItMatters && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {SECTION_TITLES.excerpt.whyItMatters}
                  </h2>
                  <MarkdownRenderer content={entry.whyItMatters} />
                </section>
              )}

              {/* 重述与延伸思考 */}
              {entry.deepDive && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {SECTION_TITLES.excerpt.deepDive}
                  </h2>
                  <MarkdownRenderer content={entry.deepDive} />
                </section>
              )}
            </>
          ) : (
            /* Standard Sections tailored by KnowledgeType */
            <>
              {/* What it is */}
              {entry.whatItIs && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {SECTION_TITLES[entry.type]?.whatItIs || '内容细节'}
                  </h2>
                  <MarkdownRenderer content={entry.whatItIs} />
                </section>
              )}

              {/* Why it matters */}
              {entry.whyItMatters && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {SECTION_TITLES[entry.type]?.whyItMatters || '为什么重要'}
                  </h2>
                  <MarkdownRenderer content={entry.whyItMatters} />
                </section>
              )}

              {/* Deep dive */}
              {entry.deepDive && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {SECTION_TITLES[entry.type]?.deepDive || '深入了解'}
                  </h2>
                  <MarkdownRenderer content={entry.deepDive} />
                </section>
              )}
            </>
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
