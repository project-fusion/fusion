import { type HighlightLanguage, highlight } from '@fusion.dev/helix-sandbox/highlight'
import {
  type AnchorHTMLAttributes,
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { SectionHeading } from '@/components/section-heading/section-heading'

/*
 * What MDX renders its elements as, for every prose surface on this site.
 *
 * **Every element markdown emits maps to a component, where the library has
 * one.** Prose the design system renders is not the case `[data-prose]` was
 * written for: that exists for markup nobody here controls, a CMS or a README,
 * and these pages are neither. A design system that documents itself in markup
 * it does not use is arguing against itself on every page.
 *
 * **`a` maps to an anchor rather than to a component**, because there is no Link
 * family: links are a base-layer recipe keyed `data-link`, and the attribute has
 * to be written here. An anchor missing it looks correct and is not:
 * `:where([data-prose] a)` and `[data-link]` share a declaration block in
 * `preview.css`, so a prose link takes the base appearance without the base's
 * attribute, and every check that could notice reads the source rather than the
 * document.
 *
 * `subtle` rather than the base variant. The base is the accent, which is right
 * for a link a reader is being sent to and wrong for prose, where a paragraph
 * citing four files would be four blue words pulling the eye off the sentence
 * they are in. Subtle reads as body text and takes the accent on hover, which
 * is the state where a reader has already chosen the link.
 *
 * The attribute is written before the spread, so a page that means something
 * else can say so: an anchor authored as raw HTML in MDX reaches this component
 * too, and `data-link="quiet"` on it wins.
 *
 * One thing still does not map, and it is the absence of a component rather
 * than a decision: **`del`**, which is GFM strikethrough and has nothing to be.
 *
 * `input` is not mapped either, and that one is worth a line: GFM emits a
 * disabled checkbox for a task list, and no page here has one. Mapping an
 * element that never renders would be a claim this file could not keep.
 */

/** Fence languages the highlighter has a grammar for, by what authors write. */
const GRAMMARS: Record<string, HighlightLanguage> = {
  bash: 'sh',
  console: 'sh',
  css: 'css',
  html: 'html',
  js: 'js',
  json: 'js',
  jsx: 'tsx',
  sh: 'sh',
  shell: 'sh',
  svelte: 'html',
  ts: 'ts',
  tsx: 'tsx',
  vue: 'html',
  zsh: 'sh',
}

/** The fence's language, from the class `remark` puts on the inner `code`. */
const languageOf = (className: string | undefined): string | undefined =>
  /language-([a-z0-9]+)/i.exec(className ?? '')?.[1]?.toLowerCase()

type Fence = ReactElement<{ children?: ReactNode; className?: string }>

/**
 * A fenced block.
 */
const CodeFence = ({ children }: { children?: ReactNode }) => {
  const fence = children as Fence | undefined
  const language = languageOf(fence?.props?.className)
  const code = String(fence?.props?.children ?? '').replace(/\n$/, '')
  const grammar = language ? GRAMMARS[language] : undefined

  return (
    <helix-code-block label={language ?? ''}>
      {grammar ? (
        <span
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from the page's own source
          dangerouslySetInnerHTML={{ __html: highlight(code, grammar) }}
        />
      ) : (
        code
      )}
    </helix-code-block>
  )
}

/**
 * Inline code, which is a different component from a fence and not a variant
 * of one. One flows with a sentence and must never scroll; the other is a
 * figure with its own box, its own overflow and something to copy.
 */
const InlineCode = ({ children }: { children?: ReactNode }) => <helix-code>{children}</helix-code>

/** A column heading, which is a column in this component rather than a cell. */
const TableColumn = ({ children }: { children?: ReactNode }) => (
  <helix-table-column>{children}</helix-table-column>
)

/**
 * A row, or the header row, which is not a row at all.
 */
const TableRow = ({ children }: { children?: ReactNode }) => {
  const heading = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === TableColumn,
  )
  return heading ? children : <helix-table-row>{children}</helix-table-row>
}

/** Every string under a node, which is what a heading's slug is made from. */
const textOf = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('')
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children)
  }
  return ''
}

/**
 * The table itself, and nothing around it.
 *
 * **The overflow belongs on the host, never on a wrapper around it.** A track
 * can be `max-content` here, so the grid can genuinely outgrow its container on
 * a narrow screen or a table of long names, and the host is the box that moves.
 * A wrapper reaches nothing: `[part="table"]` is `inline-size: 100%`, so the box
 * a wrapper would scroll never exceeds it. It costs nothing while everything
 * fits, since `auto` shows no scrollbar until there is something to scroll.
 */
const Table = ({ children }: { children?: ReactNode }) => (
  <helix-table data-prose-table>{children}</helix-table>
)

/** `thead` and `tbody` are grouping this grid does not have. */
const Unwrap = ({ children }: { children?: ReactNode }) => children

/**
 * An address for a heading, derived from what it says.
 */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const slugOf = (node: ReactNode): string => slugify(textOf(node))

/** A heading, at the level markdown asked for, addressed by its own slug. */
const heading = (as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
  function Heading({ children }: { children?: ReactNode }) {
    const id = slugOf(children)
    return (
      <SectionHeading as={as} id={id} label={textOf(children)} target={id}>
        {children}
      </SectionHeading>
    )
  }

/** The map handed to every ordinary `renderMdx` call. */
export const PROSE_COMPONENTS = {
  a: ({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-link="subtle" {...rest}>
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <helix-blockquote>{children}</helix-blockquote>
  ),
  code: InlineCode,
  em: ({ children }: { children?: ReactNode }) => <helix-text as="em">{children}</helix-text>,
  h1: heading('h1'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  h5: heading('h5'),
  h6: heading('h6'),
  hr: () => <helix-divider></helix-divider>,
  img: ({ alt, src }: { alt?: string; src?: string }) => (
    <helix-image alt={alt ?? ''} src={src ?? ''}></helix-image>
  ),
  li: ({ children }: { children?: ReactNode }) => <helix-list-item>{children}</helix-list-item>,
  ol: ({ children }: { children?: ReactNode }) => (
    <helix-list kind="ordered">{children}</helix-list>
  ),
  p: ({ children }: { children?: ReactNode }) => <helix-text as="p">{children}</helix-text>,
  pre: CodeFence,
  strong: ({ children }: { children?: ReactNode }) => (
    <helix-text as="strong">{children}</helix-text>
  ),
  table: Table,
  tbody: Unwrap,
  td: ({ children }: { children?: ReactNode }) => <helix-table-cell>{children}</helix-table-cell>,
  th: TableColumn,
  thead: Unwrap,
  tr: TableRow,
  ul: ({ children }: { children?: ReactNode }) => (
    <helix-list kind="unordered">{children}</helix-list>
  ),
}

/**
 * The same map, with ordered lists set in a rail.
 */
export const DOCUMENT_COMPONENTS = {
  ...PROSE_COMPONENTS,
  ol: ({ children }: { children?: ReactNode }) => (
    <helix-list kind="ordered" marker="rail">
      {children}
    </helix-list>
  ),
}
