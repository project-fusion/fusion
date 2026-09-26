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

/**
 * A cell, with its content in one span.
 *
 * `helix-table-cell` is a flex container, so a cell holding text and inline code
 * made each text run and each `helix-code` its own flex item. At 390 wide they
 * sat side by side and broke mid-word ("Shi ps" beside `vue.d.ts`). One span
 * gives the cell a single item, and the text inside it wraps as a line of prose.
 */
const TableCell = ({ children }: { children?: ReactNode }) => (
  <helix-table-cell>
    <span>{children}</span>
  </helix-table-cell>
)

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

/** Every string under a node, which is what decides how wide its column is. */
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

/** The rows of a table, as the cells of each. */
const rowsOf = (children: ReactNode): ReactNode[][] =>
  Children.toArray(children)
    .flatMap((group) =>
      isValidElement<{ children?: ReactNode }>(group) && group.type === Unwrap
        ? Children.toArray(group.props.children)
        : [group],
    )
    .map((row) =>
      isValidElement<{ children?: ReactNode }>(row) ? Children.toArray(row.props.children) : [],
    )
    .filter((cells) => cells.length > 0)

/**
 * The longest cell in each column, in characters.
 *
 * A proxy for width rather than a measurement of one, and it only has to be
 * good enough to rank columns against each other. Nothing here can measure
 * text: this runs once at build, on a server, with no layout.
 */
const widthsOf = (rows: ReactNode[][]): number[] => {
  const widths: number[] = []
  for (const cells of rows) {
    for (const [at, cell] of cells.entries()) {
      widths[at] = Math.max(widths[at] ?? 0, textOf(cell).trim().length)
    }
  }
  return widths
}

/**
 * A column short enough that it should simply never wrap.
 *
 * Set from what these columns actually hold: `--helix-color-background` is 24
 * characters and `@fusion.dev/helix-headless` is 18, and both were being broken across
 * three lines by a track that had no reason to be as wide as the prose beside
 * it. Above this a column is carrying a sentence or a token value, and wrapping
 * is the only thing it can do.
 */
const SHORT = 32

/**
 * The least room a wrapping column may be given before the table scrolls.
 *
 * **Never `minmax(0, …)`.** A zero minimum lets a track vanish: measured at a
 * 900px viewport, a `max-content` name column asking for 250 starved both prose
 * columns to exactly `0px` and wrapped their text to forty-eight lines. A floor
 * turns that into an overflow, which the host can scroll.
 */
const FLOOR = '14ch'

/**
 * The track list, derived from what the table holds.
 *
 * **The default track is `minmax(0, 1fr)` and it is wrong twice over here.**
 * Every column comes out the same width whatever it carries, so a column of
 * 24-character token names is as wide as a column of sentences; and the `0`
 * minimum lets a track shrink below its own content, which is what licenses the
 * browser to break inside a word. Both were visible on the same page:
 * `--helix-color-background` across three lines, and `appearance` split into
 * `appeara` and `nce` with the inline-code chip broken across the two.
 */
const tracksOf = (children: ReactNode): string | undefined => {
  const widths = widthsOf(rowsOf(children))
  if (widths.length === 0) {
    return undefined
  }
  const long = widths.filter((width) => width > SHORT)
  if (long.length === 0) {
    return widths.map((_, at) => (at === widths.length - 1 ? 'auto' : 'max-content')).join(' ')
  }
  /* Against the narrowest long column rather than against the total, so the
     numbers stay small and readable in the inspector: a column with twice the
     text of its neighbor asks for twice the room. */
  const narrowest = Math.min(...long)
  return widths
    .map((width) =>
      width > SHORT ? `minmax(${FLOOR}, ${(width / narrowest).toFixed(2)}fr)` : 'max-content',
    )
    .join(' ')
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
const Table = ({ children }: { children?: ReactNode }) => {
  const tracks = tracksOf(children)
  return (
    <helix-table data-prose-table style={tracks ? { '--table-columns': tracks } : undefined}>
      {children}
    </helix-table>
  )
}

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
  td: TableCell,
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
