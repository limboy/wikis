import { useMemo, type JSX } from 'react'
import rehypeStringify from 'rehype-stringify'
import remarkBreaks from 'remark-breaks'
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { cn } from '@/lib/utils'

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkCjkFriendly)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true })

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps): JSX.Element {
  const html = useMemo(() => {
    if (!content) return ''
    return markdownProcessor.processSync(content).toString()
  }, [content])

  return (
    <div
      className={cn('markdown-body leading-[1.8]', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
