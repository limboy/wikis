import { useMemo } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

// Configure marked for GFM
marked.setOptions({
  gfm: true,
  breaks: true
})

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return ''
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className={cn('markdown-body text-sm text-foreground/80 leading-[1.8]', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
