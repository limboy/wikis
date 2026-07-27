import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { KnowledgeSidebar } from '@/components/sidebar/knowledge-sidebar'
import { StackedNotesContainer } from '@/components/notes/stacked-notes-container'
import { useStackedNotes } from '@/hooks/use-stacked-notes'
import { getEntriesWithBacklinksAsync, sortByDate } from '@/data/utils'
import { KnowledgeEntryWithBacklinks } from '@/data/types'

export const Route = createFileRoute('/')({
  component: IndexPage
})

function IndexPage() {
  const {
    stackedNoteIds,
    openNote,
    closeNote,
    selectNote,
    containerRef
  } = useStackedNotes()

  const [sortedEntries, setSortedEntries] = useState<KnowledgeEntryWithBacklinks[]>([])

  const loadData = useCallback(async () => {
    try {
      const allEntries = await getEntriesWithBacklinksAsync()
      setSortedEntries(sortByDate(allEntries))
    } catch (err) {
      console.error('[IndexPage] Error loading knowledge entries:', err)
    }
  }, [])

  useEffect(() => {
    loadData()

    const unsubDb = window.api?.db?.onUpdated?.(() => {
      loadData()
    })

    const handleFocus = () => {
      loadData()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      if (unsubDb) unsubDb()
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadData])

  const handleSelectEntry = useCallback(
    (id: string) => {
      selectNote(id)
    },
    [selectNote]
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <KnowledgeSidebar
        entries={sortedEntries}
        activeNoteIds={stackedNoteIds}
        onSelectEntry={handleSelectEntry}
        onEntriesChange={setSortedEntries}
      />
      <StackedNotesContainer
        entries={sortedEntries}
        stackedNoteIds={stackedNoteIds}
        onOpenNote={openNote}
        onCloseNote={closeNote}
        containerRef={containerRef}
      />
    </div>
  )
}
