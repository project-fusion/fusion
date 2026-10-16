import type { MarkdownAlertKind, MarkdownAlign, MarkdownBlock, MarkdownItem } from './blocks.js'
import { type MarkdownInline, parseInline } from './inline.js'
import { MarkdownStream } from './stream.js'

/** A node of what a document draws: an element, or the text of a text node. */
export type MarkdownNode = string | MarkdownElement

/** An element of what a document draws. */
export interface MarkdownElement {
  attributes: Record<string, string>
  children: MarkdownNode[]
  tag: string
}

/** How a document is drawn. */
export interface MarkdownOptions {
  /** Each alert's heading by its kind. English by default. */
  headings?: Partial<Record<MarkdownAlertKind, string>> | undefined
  /**
   * The tags for a fence and an alert, which name the tier they are drawn in.
   * `helix-code-block` and `helix-callout` by default.
   */
  tags?: Partial<MarkdownTags> | undefined
}

/** The options with every default filled in. */
export interface MarkdownFilled {
  headings: Record<MarkdownAlertKind, string>
  tags: MarkdownTags
}

/** The elements a document draws from another family. */
export interface MarkdownTags {
  callout: string
  codeBlock: string
}

const HEADINGS: Record<MarkdownAlertKind, string> = {
  caution: 'Caution',
  important: 'Important',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
}

/** Each alert's tone, where one of the four says it, as `rehypeHelix` gives it. */
const TONES: Record<MarkdownAlertKind, string | undefined> = {
  caution: 'danger',
  important: undefined,
  note: 'info',
  tip: 'success',
  warning: 'warning',
}

const element = (
  tag: string,
  children: MarkdownNode[] = [],
  attributes: Record<string, string> = {},
): MarkdownElement => ({ attributes, children, tag })

/**
 * The address, where it is one a link may follow: a relative address, or one
 * on `http`, `https`, `mailto` or `tel`. Anything else, `javascript:` and
 * `data:` among them, is dropped, and the link is drawn as its text.
 */
export const safeUrl = (url: string): string | undefined => {
  const trimmed = url.trim()
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(trimmed)?.[1]?.toLowerCase()
  return scheme === undefined || ['http', 'https', 'mailto', 'tel'].includes(scheme)
    ? trimmed
    : undefined
}

const inlineNodes = (nodes: MarkdownInline[]): MarkdownNode[] =>
  nodes.flatMap((node): MarkdownNode[] => {
    switch (node.kind) {
      case 'break':
        return [element('br')]
      case 'code':
        return [element('code', [node.text])]
      case 'del':
      case 'em':
      case 'strong':
        return [element(node.kind, inlineNodes(node.children))]
      case 'image': {
        /* As a link to the picture: an image that loads moves every line
           under it, and a reply's picture is a request to an address the
           page did not choose. */
        const href = safeUrl(node.src)
        const words = node.alt || node.src
        return href === undefined
          ? [words]
          : [
              element(
                'a',
                [words],
                node.title === undefined ? { href } : { href, title: node.title },
              ),
            ]
      }
      case 'link': {
        const children = inlineNodes(node.children)
        if (node.href === undefined) {
          /* A link still arriving, drawn as one so it does not change when
             its address does. */
          return [element('a', children)]
        }
        const href = safeUrl(node.href)
        if (href === undefined) {
          return children
        }
        return [
          element('a', children, node.title === undefined ? { href } : { href, title: node.title }),
        ]
      }
      default:
        return node.text === '' ? [] : [node.text]
    }
  })

const inline = (text: string, open: boolean): MarkdownNode[] =>
  inlineNodes(parseInline(text, { open }))

/* An attribute the prose recipe aligns by, and never a `style`: a page whose
   content security policy refuses inline styles would drop it. */
const aligned = (align: MarkdownAlign): Record<string, string> =>
  align === undefined ? {} : { 'data-align': align }

/**
 * Each column's share of a table's width, from its heading's length, between
 * 4 and 24 characters. Set once, from the rows that arrive first, so the
 * columns never move as the rest arrives.
 */
export const columnShares = (head: string[]): number[] => {
  const weights = head.map((cell) => Math.min(24, Math.max(4, cell.length)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return weights.map((weight) => Math.round((weight / total) * 10000) / 100)
}

const itemNode = (item: MarkdownItem, open: boolean, options: MarkdownFilled): MarkdownElement => {
  const [first, ...rest] = item.children
  /* The item's first paragraph is its text, without a `p`, whether the list is
     tight or loose, so a blank line arriving between two items changes no
     spacing above it. */
  const lead =
    first?.kind === 'paragraph'
      ? inline(first.text, open && rest.length === 0)
      : first
        ? [blockNode(first, open && rest.length === 0, options)]
        : []
  const tail = rest.map((block, index) =>
    blockNode(block, open && index === rest.length - 1, options),
  )
  if (item.checked === undefined) {
    return element('li', [...lead, ...tail])
  }
  const box = element(
    'input',
    [],
    item.checked
      ? { checked: '', disabled: '', type: 'checkbox' }
      : { disabled: '', type: 'checkbox' },
  )
  return element('li', [box, ' ', ...lead, ...tail], { 'data-task': '' })
}

/** A block as the node it draws. `open` reads its end as still arriving. */
export const blockNode = (
  block: MarkdownBlock,
  open: boolean,
  options: MarkdownFilled,
): MarkdownElement => {
  switch (block.kind) {
    case 'code': {
      const language = block.info.split(/\s+/)[0] ?? ''
      return element(
        options.tags.codeBlock,
        [block.text],
        language === '' ? {} : { label: language, language },
      )
    }
    case 'heading':
      return element(`h${block.level}`, inline(block.text, open))
    case 'list':
      return element(
        block.ordered ? 'ol' : 'ul',
        block.items.map((item, index) =>
          itemNode(item, open && index === block.items.length - 1, options),
        ),
        block.ordered && block.start !== 1 ? { start: String(block.start) } : {},
      )
    case 'paragraph':
      return element('p', inline(block.text, open))
    case 'quote': {
      const children = block.children.map((child, index) =>
        blockNode(child, open && index === block.children.length - 1, options),
      )
      if (block.alert === undefined) {
        return element('blockquote', children)
      }
      const tone = TONES[block.alert]
      return element(
        options.tags.callout,
        [element('span', [options.headings[block.alert]], { slot: 'heading' }), ...children],
        tone === undefined ? {} : { tone },
      )
    }
    case 'rule':
      return element('hr')
    case 'table': {
      const shares = columnShares(block.head)
      /* In a box of its own that scrolls, so the table can keep a table's
         fixed layout, which a scrolling table drawn as a block cannot. */
      const table = element(
        'table',
        [
          element(
            'colgroup',
            shares.map((share) => element('col', [], { width: `${share}%` })),
          ),
          element('thead', [
            element(
              'tr',
              block.head.map((cell, column) =>
                element('th', inline(cell, false), aligned(block.align[column])),
              ),
            ),
          ]),
          element(
            'tbody',
            block.rows.map((row, at) =>
              element(
                'tr',
                row.map((cell, column) =>
                  element(
                    'td',
                    inline(cell, open && at === block.rows.length - 1 && column === row.length - 1),
                    aligned(block.align[column]),
                  ),
                ),
              ),
            ),
          ),
        ],
        { 'data-columns': String(block.head.length) },
      )
      return element('div', [table], { 'data-table': '' })
    }
  }
}

/** The options with every default filled in. */
export const withDefaults = (options: MarkdownOptions = {}): MarkdownFilled => ({
  headings: { ...HEADINGS, ...options.headings },
  tags: { callout: 'helix-callout', codeBlock: 'helix-code-block', ...options.tags },
})

/** A finished document's nodes. */
export const markdownNodes = (text: string, options: MarkdownOptions = {}): MarkdownElement[] => {
  const filled = withDefaults(options)
  return new MarkdownStream()
    .read(text, true)
    .blocks.map((block) => blockNode(block, false, filled))
}

const VOID = new Set(['br', 'col', 'hr', 'input'])

const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeAttribute = (text: string): string => escapeText(text).replace(/"/g, '&quot;')

/** A node as HTML, the way a browser serializes the element it draws. */
export const nodeHtml = (node: MarkdownNode): string => {
  if (typeof node === 'string') {
    return escapeText(node)
  }
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => (value === '' ? ` ${name}=""` : ` ${name}="${escapeAttribute(value)}"`))
    .join('')
  if (VOID.has(node.tag)) {
    return `<${node.tag}${attributes}>`
  }
  return `<${node.tag}${attributes}>${node.children.map(nodeHtml).join('')}</${node.tag}>`
}

/**
 * A finished document as HTML, for a server to send inside `helix-markdown`.
 *
 * The element takes over what it is sent where the markup is exactly what it
 * would draw for its `text`, so a page served this way draws the reply before
 * any script runs and does not draw it again.
 */
export const markdownToHtml = (text: string, options: MarkdownOptions = {}): string =>
  markdownNodes(text, options).map(nodeHtml).join('')
