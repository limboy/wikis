import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { KnowledgeSidebar } from '@/components/sidebar/knowledge-sidebar'
import { StackedNotesContainer } from '@/components/notes/stacked-notes-container'
import { useStackedNotes } from '@/hooks/use-stacked-notes'
import { getEntriesWithBacklinks, sortByDate } from '@/data/utils'

export const Route = createFileRoute('/')({
  component: IndexPage
})

function IndexPage() {
  const allEntries = getEntriesWithBacklinks()
  const {
    stackedNoteIds,
    openNote,
    closeNote,
    selectNote,
    containerRef
  } = useStackedNotes()

  const [sortedEntries, setSortedEntries] = useState(() => sortByDate(allEntries))

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
        stackedNoteIds={stackedNoteIds}
        onOpenNote={openNote}
        onCloseNote={closeNote}
        containerRef={containerRef}
      />
    </div>
  )
}
