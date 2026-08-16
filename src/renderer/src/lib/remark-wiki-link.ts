import { findAndReplace } from 'mdast-util-find-and-replace'
import type { Link, Root } from 'mdast'
import type { Plugin } from 'unified'

// Matches Obsidian-style wiki links: [[Target]] or [[Target|Alias]].
const WIKI_LINK_PATTERN = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g

export interface WikiLinkResolution {
  /** Entry id to navigate to when the link is clicked. */
  id: string
  /** Whether the target actually resolved to a known entry. */
  exists: boolean
}

export type ResolveWikiLink = (target: string) => WikiLinkResolution | undefined

export interface RemarkWikiLinkOptions {
  resolve?: ResolveWikiLink
}

/**
 * Turns `[[Target]]` / `[[Target|Alias]]` text into mdast link nodes so they
 * render through the normal remark → rehype pipeline. Resolution against the
 * known entries happens here (via `options.resolve`) rather than after the
 * HTML is produced, so unresolved targets can be flagged with a distinct
 * class right away.
 */
const remarkWikiLink: Plugin<[RemarkWikiLinkOptions?], Root> = (options = {}) => {
  const { resolve } = options

  return (tree) => {
    findAndReplace(
      tree,
      [
        WIKI_LINK_PATTERN,
        (_match: string, rawTarget: string, rawAlias?: string): Link => {
          const target = rawTarget.trim()
          const label = (rawAlias ?? target).trim()
          const resolution = resolve?.(target)

          return {
            type: 'link',
            url: `wiki-link:${encodeURIComponent(resolution?.id ?? target)}`,
            data: {
              hProperties: {
                className: resolution?.exists ? ['wiki-link'] : ['wiki-link', 'wiki-link-broken'],
                'data-wiki-target': target,
                'data-wiki-resolved': resolution?.exists ? 'true' : 'false'
              }
            },
            children: [{ type: 'text', value: label }]
          }
        }
      ],
      { ignore: ['link', 'linkReference', 'code', 'inlineCode'] }
    )
  }
}

export default remarkWikiLink
