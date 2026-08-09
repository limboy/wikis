import { useState, useRef, useCallback, useLayoutEffect, type RefObject } from 'react'

export interface UseStackedNotes {
  stackedNoteIds: string[]
  openNote: (noteId: string, fromIndex: number) => void
  selectNote: (noteId: string) => void
  closeNote: (index: number) => void
  containerRef: RefObject<HTMLDivElement | null>
}

export function useStackedNotes(initialNoteId?: string): UseStackedNotes {
  const [stackedNoteIds, setStackedNoteIds] = useState<string[]>(
    initialNoteId ? [initialNoteId] : []
  )
  const containerRef = useRef<HTMLDivElement>(null)
  // Pane to scroll to once React has committed a newly pushed note. Held in a
  // ref so the scroll is driven by the commit itself rather than by a fixed
  // timeout racing the render.
  const pendingScrollIndex = useRef<number | null>(null)

  const scrollToPane = useCallback((index: number) => {
    const pane = containerRef.current?.children[index] as HTMLElement | undefined
    pane?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }, [])

  useLayoutEffect(() => {
    if (pendingScrollIndex.current === null) return
    const index = pendingScrollIndex.current
    pendingScrollIndex.current = null
    scrollToPane(index)
  }, [stackedNoteIds, scrollToPane])

  const openNote = useCallback(
    (noteId: string, fromIndex: number) => {
      const existingIndex = stackedNoteIds.indexOf(noteId)
      if (existingIndex !== -1) {
        // Already on screen, so the DOM needs no update — scroll right away.
        scrollToPane(existingIndex)
        return
      }

      const nextStack = [...stackedNoteIds.slice(0, fromIndex + 1), noteId]
      pendingScrollIndex.current = nextStack.length - 1
      setStackedNoteIds(nextStack)
    },
    [stackedNoteIds, scrollToPane]
  )

  const selectNote = useCallback(
    (noteId: string) => {
      const existingIndex = stackedNoteIds.indexOf(noteId)
      if (existingIndex !== -1) {
        scrollToPane(existingIndex)
        return
      }

      pendingScrollIndex.current = 0
      setStackedNoteIds([noteId])
    },
    [stackedNoteIds, scrollToPane]
  )

  const closeNote = useCallback((index: number) => {
    setStackedNoteIds((prev) => prev.slice(0, index))
  }, [])

  return {
    stackedNoteIds,
    openNote,
    selectNote,
    closeNote,
    containerRef
  }
}
