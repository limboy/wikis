import { useState, useRef, useEffect } from 'react'

export function useStackedNotes(initialNoteId?: string) {
  const [stackedNoteIds, setStackedNoteIds] = useState<string[]>(initialNoteId ? [initialNoteId] : [])
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [shouldScrollToIndex, setShouldScrollToIndex] = useState<number | null>(null)

  const openNote = (noteId: string, fromIndex: number) => {
    setStackedNoteIds(prev => {
      // Avoid duplicate adjacent notes
      if (prev[fromIndex + 1] === noteId) {
        setShouldScrollToIndex(fromIndex + 1)
        return prev
      }
      
      const nextStack = prev.slice(0, fromIndex + 1)
      nextStack.push(noteId)
      setShouldScrollToIndex(nextStack.length - 1)
      return nextStack
    })
  }

  const closeNote = (index: number) => {
    setStackedNoteIds(prev => prev.slice(0, index))
  }

  const setInitialNote = (noteId: string) => {
    setStackedNoteIds([noteId])
    setShouldScrollToIndex(0)
  }

  useEffect(() => {
    if (shouldScrollToIndex === null || !containerRef.current) return
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return
      const pane = containerRef.current.children[shouldScrollToIndex] as HTMLElement
      if (pane) {
        pane.scrollIntoView({ behavior: 'smooth', inline: 'end' })
      }
      setShouldScrollToIndex(null)
    }, 50)
    return () => clearTimeout(timeoutId)
  }, [stackedNoteIds, shouldScrollToIndex])

  return {
    stackedNoteIds,
    openNote,
    closeNote,
    setInitialNote,
    containerRef
  }
}
