import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchEntries } from '@/data/utils'
import { KnowledgeEntryWithBacklinks, KNOWLEDGE_TYPE_LABELS } from '@/data/types'
import { getTypeIcon, typeColorClasses, formatRelativeDate } from '@/lib/knowledge-entry-ui'

interface SearchOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: KnowledgeEntryWithBacklinks[]
  onSelectEntry: (id: string) => void
}

export function SearchOverlay({
  open,
  onOpenChange,
  entries,
  onSelectEntry
}: SearchOverlayProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const results = useMemo(() => searchEntries(entries, query), [entries, query])

  // Reset transient state whenever the overlay opens, and reset the
  // selection whenever the query changes — both adjusted during render
  // (React's recommended pattern) rather than in an effect, so there's no
  // extra render round-trip.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveIndex(0)
  }

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelect = (id: string): void => {
    onSelectEntry(id)
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const entry = results[activeIndex]
      if (entry) handleSelect(entry.id)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup
          aria-label="搜索知识库"
          initialFocus={inputRef}
          onKeyDown={handleKeyDown}
          className="fixed top-[15%] left-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-4 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-top-4"
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、内容、标签..."
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {query.trim() === '' ? (
              <div className="p-8 text-center text-xs text-muted-foreground">输入以开始搜索</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                没有找到匹配的条目
              </div>
            ) : (
              results.map((entry, index) => {
                const isActive = index === activeIndex
                return (
                  <button
                    key={entry.id}
                    ref={isActive ? activeItemRef : undefined}
                    type="button"
                    onClick={() => handleSelect(entry.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer',
                      isActive && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium line-clamp-1">{entry.title}</span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {formatRelativeDate(entry.createdAt)}
                      </span>
                    </div>
                    {entry.oneLiner && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {entry.oneLiner}
                      </div>
                    )}
                    <span
                      className={cn(
                        'inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                        typeColorClasses[entry.type]
                      )}
                    >
                      {getTypeIcon(entry.type)}
                      {KNOWLEDGE_TYPE_LABELS[entry.type]}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ 选择 · ↵ 打开 · Esc 关闭</span>
            {results.length > 0 && <span>{results.length} 条结果</span>}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
