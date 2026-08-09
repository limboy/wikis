import { RefObject, type JSX } from 'react'
import { KnowledgeEntryWithBacklinks } from '@/data/types'
import { getEntryById, getSourceDataByTitle } from '@/data/utils'
import { NotePane } from './note-pane'
import { SourcePane } from './source-pane'

interface StackedNotesContainerProps {
  entries: KnowledgeEntryWithBacklinks[]
  stackedNoteIds: string[]
  onOpenNote: (noteId: string, fromIndex: number) => void
  onCloseNote: (index: number) => void
  containerRef: RefObject<HTMLDivElement | null>
}

export function StackedNotesContainer({
  entries,
  stackedNoteIds,
  onOpenNote,
  onCloseNote,
  containerRef
}: StackedNotesContainerProps): JSX.Element {
  if (stackedNoteIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">📚</span>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">从左侧选择一个知识点</span>
            <span className="text-xs text-muted-foreground/60">开始你的知识漫游之旅</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex overflow-x-auto overflow-y-hidden"
      style={{ scrollBehavior: 'smooth' }}
    >
      {stackedNoteIds.map((noteId, index) => {
        if (noteId.startsWith('source:')) {
          const sourceTitle = noteId.slice(7)
          const sourceData = getSourceDataByTitle(sourceTitle, entries)
          if (!sourceData) return null

          return (
            <SourcePane
              key={`${noteId}-${index}`}
              source={sourceData.source}
              entries={sourceData.entries}
              paneIndex={index}
              onOpenNote={onOpenNote}
              onClose={onCloseNote}
            />
          )
        }

        const entry = getEntryById(noteId, entries)
        if (!entry) return null

        return (
          <NotePane
            key={`${noteId}-${index}`}
            entry={entry}
            allEntries={entries}
            paneIndex={index}
            onOpenNote={onOpenNote}
            onClose={onCloseNote}
          />
        )
      })}
    </div>
  )
}
