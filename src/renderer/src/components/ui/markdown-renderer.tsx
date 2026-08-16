import { useCallback, useMemo, type JSX, type MouseEvent } from 'react'
import rehypeStringify from 'rehype-stringify'
import remarkBreaks from 'remark-breaks'
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { cn } from '@/lib/utils'
import remarkWikiLink, { type ResolveWikiLink } from '@/lib/remark-wiki-link'

const WIKI_LINK_HREF_PREFIX = 'wiki-link:'

interface MarkdownRendererProps {
  content: string
  className?: string
  /** Resolves a `[[Target]]` wiki-link's raw text to a known entry, if any. */
  resolveWikiLink?: ResolveWikiLink
  /** Called with the resolved entry id when a wiki-link is clicked. */
  onWikiLinkClick?: (id: string) => void
}

export function MarkdownRenderer({
  content,
  className,
  resolveWikiLink,
  onWikiLinkClick
}: MarkdownRendererProps): JSX.Element {
  // Rebuilt only when the resolver changes (i.e. the surrounding entry list
  // changes), not on every keystroke-equivalent content update.
  const processor = useMemo(
    () =>
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkCjkFriendly)
        .use(remarkBreaks)
        .use(remarkWikiLink, { resolve: resolveWikiLink })
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true }),
    [resolveWikiLink]
  )

  const html = useMemo(() => {
    if (!content) return ''
    return processor.processSync(content).toString()
  }, [content, processor])

  // The markdown is injected as raw HTML, so wiki-links are plain <a> tags —
  // catch their clicks here via delegation instead of attaching handlers per
  // link, and keep Electron from treating the fake `wiki-link:` href as a
  // real navigation.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-wiki-target]')
      if (!link) return
      event.preventDefault()
      if (link.dataset.wikiResolved !== 'true' || !onWikiLinkClick) return
      const href = link.getAttribute('href') ?? ''
      if (!href.startsWith(WIKI_LINK_HREF_PREFIX)) return
      onWikiLinkClick(decodeURIComponent(href.slice(WIKI_LINK_HREF_PREFIX.length)))
    },
    [onWikiLinkClick]
  )

  return (
    <div
      className={cn('markdown-body leading-[1.8]', className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
