import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect, useMemo, type JSX } from 'react'
import { KnowledgeSidebar, type SortMode } from '@/components/sidebar/knowledge-sidebar'
import { StackedNotesContainer } from '@/components/notes/stacked-notes-container'
import { useStackedNotes } from '@/hooks/use-stacked-notes'
import { getEntriesWithBacklinksAsync, sortByDate, shuffleEntries } from '@/data/utils'
import { KnowledgeEntryWithBacklinks } from '@/data/types'

export const Route = createFileRoute('/')({
  component: IndexPage
})

function IndexPage(): JSX.Element {
  const { stackedNoteIds, openNote, closeNote, selectNote, containerRef } = useStackedNotes()

  const [entries, setEntries] = useState<KnowledgeEntryWithBacklinks[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const loadData = async (): Promise<void> => {
      try {
        const allEntries = await getEntriesWithBacklinksAsync()
        if (!cancelled) setEntries(allEntries)
      } catch (err) {
        console.error('[IndexPage] Error loading knowledge entries:', err)
      }
    }

    void loadData()

    const unsubDb = window.api?.db?.onUpdated?.(() => {
      void loadData()
    })

    const handleFocus = (): void => {
      void loadData()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      if (unsubDb) unsubDb()
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Ordering is derived, so refreshes triggered by a database write or by the
  // window regaining focus no longer knock the list back to newest-first.
  const orderedEntries = useMemo(
    () => (sortMode === 'shuffle' ? shuffleEntries(entries, shuffleSeed) : sortByDate(entries)),
    [entries, sortMode, shuffleSeed]
  )

  const handleSortModeChange = useCallback((mode: SortMode) => {
    setSortMode(mode)
    if (mode === 'shuffle') setShuffleSeed(Date.now())
  }, [])

  const handleSelectEntry = useCallback(
    (id: string) => {
      selectNote(id)
    },
    [selectNote]
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <KnowledgeSidebar
        entries={orderedEntries}
        activeNoteIds={stackedNoteIds}
        onSelectEntry={handleSelectEntry}
        sortMode={sortMode}
        onSortModeChange={handleSortModeChange}
      />
      <div className="relative flex flex-1 min-w-0">
        {/* Keeps the area the panes don't cover draggable. The separator line is
            drawn by each pane's own title bar, so this strip stays borderless. */}
        <div
          className="absolute inset-x-0 top-0 h-[44px] -z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <StackedNotesContainer
          entries={orderedEntries}
          stackedNoteIds={stackedNoteIds}
          onOpenNote={openNote}
          onCloseNote={closeNote}
          containerRef={containerRef}
        />
      </div>
    </div>
  )
}
