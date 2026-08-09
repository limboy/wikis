import { useState, useRef, useCallback, type RefObject } from 'react'

export interface UseStackedNotes {
  stackedNoteIds: string[]
  openNote: (noteId: string, fromIndex: number) => void
  selectNote: (noteId: string) => void
  closeNote: (index: number) => void
  setInitialNote: (noteId: string) => void
  containerRef: RefObject<HTMLDivElement | null>
  scrollToPane: (index: number) => void
}

export function useStackedNotes(initialNoteId?: string): UseStackedNotes {
  const [stackedNoteIds, setStackedNoteIds] = useState<string[]>(
    initialNoteId ? [initialNoteId] : []
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToPane = useCallback((index: number) => {
    setTimeout(() => {
      if (!containerRef.current) return
      const pane = containerRef.current.children[index] as HTMLElement
      if (pane) {
        pane.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      }
    }, 50)
  }, [])

  const openNote = useCallback(
    (noteId: string, fromIndex: number) => {
      setStackedNoteIds((prev) => {
        const existingIndex = prev.indexOf(noteId)
        if (existingIndex !== -1) {
          scrollToPane(existingIndex)
          return prev
        }

        const nextStack = prev.slice(0, fromIndex + 1)
        nextStack.push(noteId)
        scrollToPane(nextStack.length - 1)
        return nextStack
      })
    },
    [scrollToPane]
  )

  const selectNote = useCallback(
    (noteId: string) => {
      setStackedNoteIds((prev) => {
        const existingIndex = prev.indexOf(noteId)
        if (existingIndex !== -1) {
          scrollToPane(existingIndex)
          return prev
        }
        scrollToPane(0)
        return [noteId]
      })
    },
    [scrollToPane]
  )

  const closeNote = useCallback((index: number) => {
    setStackedNoteIds((prev) => prev.slice(0, index))
  }, [])

  const setInitialNote = useCallback(
    (noteId: string) => {
      selectNote(noteId)
    },
    [selectNote]
  )

  return {
    stackedNoteIds,
    openNote,
    selectNote,
    closeNote,
    setInitialNote,
    containerRef,
    scrollToPane
  }
}
