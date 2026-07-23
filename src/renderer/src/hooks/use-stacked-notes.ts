import { useState, useRef, useEffect } from 'react'

export function useStackedNotes(initialNoteId?: string) {
  const [stackedNoteIds, setStackedNoteIds] = useState<string[]>(initialNoteId ? [initialNoteId] : [])
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [shouldScrollToIndex, setShouldScrollToIndex] = useState<number | null>(null)

  const openNote = (noteId: string, fromIndex: number) => {
    setStackedNoteIds(prev => {
      // If note is already opened anywhere in the stack, scroll to it
      const existingIndex = prev.indexOf(noteId)
      if (existingIndex !== -1) {
        setShouldScrollToIndex(existingIndex)
        return prev
      }
      
      const nextStack = prev.slice(0, fromIndex + 1)
      nextStack.push(noteId)
      setShouldScrollToIndex(nextStack.length - 1)
      return nextStack
    })
  }

  const selectNote = (noteId: string) => {
    setStackedNoteIds(prev => {
      // If note is already opened in the stack, scroll to it
      const existingIndex = prev.indexOf(noteId)
      if (existingIndex !== -1) {
        setShouldScrollToIndex(existingIndex)
        return prev
      }
      setShouldScrollToIndex(0)
      return [noteId]
    })
  }

  const closeNote = (index: number) => {
    setStackedNoteIds(prev => prev.slice(0, index))
  }

  const setInitialNote = (noteId: string) => {
    selectNote(noteId)
  }

  useEffect(() => {
    if (shouldScrollToIndex === null || !containerRef.current) return
    const targetIndex = shouldScrollToIndex
    setShouldScrollToIndex(null)

    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return
      const pane = containerRef.current.children[targetIndex] as HTMLElement
      if (pane) {
        pane.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      }
    }, 50)
    return () => clearTimeout(timeoutId)
  }, [stackedNoteIds, shouldScrollToIndex])

  return {
    stackedNoteIds,
    openNote,
    selectNote,
    closeNote,
    setInitialNote,
    containerRef
  }
}
