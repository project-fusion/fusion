import { type HighlightLanguage, highlight } from '@helix-io/sandbox/highlight'
import {
  type AnchorHTMLAttributes,
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import styles from './prose.module.css'

/*
 * What MDX renders its elements as, for every prose surface on this site.
 *
 * **MDX was rendering bare HTML and nothing was mapping it.** `renderMdx` took
 * no components, so a fenced block came out as `<pre><code>` with no
 * highlighting and no way to take the code, and a table came out as a `<table>`
 * styled by nine lines of CSS beside the component the same site uses for every
 * API reference. The base layer was carrying the rest through `[data-prose]`,
 * which is what made the gap invisible: the pages looked deliberate rather than
 * unmapped.
 *
 * **Every element markdown emits maps to a component, where the library has
 * one.** Prose the design system renders is not the case `[data-prose]` was
 * written for: that exists for markup nobody here controls, a CMS or a README,
 * and these pages are neither. A design system that documents itself in markup
 * it does not use is arguing against itself on every page.
 *
 * **`a` maps to an anchor rather than to a component**, because there is no Link
 * family: links are a base-layer recipe keyed `data-link`. The note here used to
 * say the anchor carried that attribute already and it did not. Nothing put it
 * there, no plugin added one, and the only `data-link` in this package was that
 * sentence. It was invisible because `:where([data-prose] a)` and `[data-link]`
 * share a declaration block in `preview.css`, so a prose link had the base
 * appearance without the base's attribute, and every check that could have
 * noticed reads the source rather than the document.
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
 *
 * The text and the language come off the `code` element MDX nests inside the
 * `pre`, which is where remark puts both. A fence whose language has no grammar
 * renders its text as a child rather than as markup: `text` and the unlabelled
 * ones are code, they are just not code anything here can parse, and passing
 * them through the highlighter would hand back the input with no spans in it
 * while claiming otherwise.
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
 *
 * A fence reaches here too, since remark nests a `code` inside every `pre`, and
 * `CodeFence` reads that element's props rather than rendering it. So this only
 * ever renders for code that is genuinely inline.
 */
const InlineCode = ({ children }: { children?: ReactNode }) => <helix-code>{children}</helix-code>

/** A column heading, which is a column in this component rather than a cell. */
const TableColumn = ({ children }: { children?: ReactNode }) => (
  <helix-table-column>{children}</helix-table-column>
)

/**
 * A row, or the header row, which is not a row at all.
 *
 * `helix-table` is a grid: its columns and its rows are siblings, and a cell
 * belongs to a row while a heading belongs to the table. GFM emits
 * `thead > tr > th`, so two levels of nesting have to come out, and this is the
 * lower one. It reads its own children rather than taking a flag from a
 * context, because a context needs a client boundary and every one of these
 * pages is a server component rendered once at build.
 *
 * The test is exact rather than structural: `th` maps to `TableColumn` and this
 * asks whether that is what it was handed. A row of cells that merely looks
 * like a heading is still a row.
 */
const TableRow = ({ children }: { children?: ReactNode }) => {
  const heading = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === TableColumn,
  )
  return heading ? children : <helix-table-row>{children}</helix-table-row>
}

/*
 * The table itself, and nothing around it.
 *
 * **It had a wrapper carrying `overflow-x: auto`, copied from `.apiTable` on the
 * component pages, and for a markdown table that wrapper can never do
 * anything.** `[part="table"]` is `inline-size: 100%` and a column with no
 * declared width takes `minmax(0, 1fr)`, a track that may shrink below its own
 * content, so the grid cannot exceed its container at any width. Measured on
 * the widest table in the documentation at 1280, 900, 600 and 420: `scrollWidth`
 * equalled `clientWidth` every time.
 *
 * **`.apiTable` is not the same case and keeps its wrapper.** Those tables
 * declare fixed column widths summing to 650px, so they genuinely overflow and
 * genuinely scroll: measured, 650 against a 324 container at 420. The
 * difference is the tracks, not the markup, which is exactly why copying the
 * wrapper across brought none of its behavior with it.
 *
 * Putting the attribute on the element rather than a parent would have been
 * just as inert, and it is where it would belong if these ever do need to
 * scroll, since the host is the box that would move.
 *
 * The squeeze is real and is a separate thing. A long token value in a narrow
 * column wraps, and making it scroll instead means changing the tracks too:
 * under intrinsic sizing `1fr` gives every column the width of the widest, so
 * the same table came out 4261 wide with all three columns equal, which is
 * worse to read than the wrap.
 *
 * No `label`. A markdown table has no caption to take one from, and inventing
 * one would put a name on the table that the page never says out loud.
 */
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
 * characters and `@helix-io/headless` is 18, and both were being broken across
 * three lines by a track that had no reason to be as wide as the prose beside
 * it. Above this a column is carrying a sentence or a token value, and wrapping
 * is the only thing it can do.
 */
const SHORT = 32

/**
 * The least room a wrapping column may be given before the table scrolls.
 *
 * **`minmax(0, …)` is what made the first version of this worse than what it
 * replaced.** A zero minimum lets a track vanish: measured on the docs column at
 * a 900px viewport, where the sidebar leaves 240px, a `max-content` name column
 * asking for 250 starved both prose columns to exactly `0px` and the text
 * inside them wrapped to forty-eight lines. A floor turns that into an overflow
 * instead, and an overflow is a thing the host can scroll.
 *
 * Fourteen characters, which is narrow enough that it binds only when the
 * column is genuinely too small to read a table in, and wide enough to be worth
 * scrolling to.
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
 *
 * So a short column takes `max-content`, which is exactly its longest cell and
 * cannot wrap, and everything else divides what is left in proportion to how
 * much text it holds. The proportion is what stops a two-word column and a
 * two-sentence column being handed the same room.
 *
 * **The last track is `auto` when nothing is long**, because `max-content`
 * tracks do not stretch: a table of five short columns would otherwise sit in a
 * puddle at the left of its own container.
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
 * It had a wrapper carrying `overflow-x: auto`, copied from `.apiTable` on the
 * component pages, and for a markdown table that wrapper could never do
 * anything: `[part="table"]` is `inline-size: 100%` and every column was
 * `minmax(0, 1fr)`, so the grid could not exceed its container at any width.
 * Measured at 1280, 900, 600 and 420, `scrollWidth` equalled `clientWidth`
 * every time.
 *
 * `.apiTable` is not the same case and keeps its wrapper: those tables declare
 * fixed column widths summing to 650px, so they genuinely overflow and
 * genuinely scroll. The difference is the tracks rather than the markup, which
 * is why copying the wrapper across brought none of its behavior with it.
 *
 * **Now that a track can be `max-content`, the grid can genuinely outgrow its
 * container**, on a narrow screen or a table of long names, so the host takes
 * the overflow. On the element rather than a parent, which is where it belongs:
 * the host is the box that moves. It costs nothing while everything fits, since
 * `auto` shows no scrollbar until there is something to scroll.
 *
 * No `label`. A markdown table has no caption to take one from, and inventing
 * one would put a name on the table that the page never says out loud.
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
 *
 * `textOf` is the one the table already uses to measure a column, and a heading
 * needs the same walk for the same reason: a heading can hold a link, a `code`
 * span or an emphasis, so its children are a tree and `String(children)` gives
 * `[object Object]`.
 *
 * Derived rather than counted, so a link keeps working when a section moves and
 * breaks when it is renamed, which is the honest pair: a renamed section is a
 * different section, and a link to the old name should fail rather than land on
 * whatever now sits in that position.
 *
 * **Exported, because a second reader of it exists now.** The page outline lists
 * a document's own sections and has to link to them, which means deriving the
 * same anchors from the same headings without a rendered DOM to read them from.
 * Two implementations of this would be two implementations of a link target,
 * and the failure is silent: every entry in the rail scrolls nowhere and the
 * page looks fine.
 */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const slugOf = (node: ReactNode): string => slugify(textOf(node))

/**
 * A heading, at the level markdown asked for, with a link to itself.
 *
 * The link is what makes a section shareable, which prose had no way to be:
 * headings carried no `id` at all, so the only address a reader could send was
 * the whole page.
 *
 * `aria-hidden` on the mark and a label on the link, so a screen reader hears
 * "link, Section name" once rather than the heading text followed by a hash.
 */
const heading = (as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
  function Heading({ children }: { children?: ReactNode }) {
    const id = slugOf(children)
    return (
      <helix-text as={as} class={styles.heading} id={id || undefined}>
        {id && (
          /* An anchor rather than `helix-icon-button`, which is a `button` and
             has no `href`. What this is for is sending somebody the address, so
             it has to be a real link: middle-click opens a tab, the context menu
             offers "copy link address", and the status bar shows where it goes.
             None of that is reachable from a button with a click handler. It
             takes the icon button's *appearance* instead. */
          <a aria-label={`Link to ${textOf(children)}`} className={styles.anchor} href={`#${id}`}>
            <helix-icon name="link"></helix-icon>
          </a>
        )}
        {children}
      </helix-text>
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
 *
 * An argued document numbers its claims, and a claim is a sentence with prose
 * under it rather than a short row: the numbers want to read as a column down
 * the left with every claim beginning at one measure, which is `marker="rail"`.
 * A numbered list in the component documentation is a list of steps and wants
 * the platform's marker beside the words, so the two cannot share one map.
 *
 * **A spread over `PROSE_COMPONENTS` and never a map of its own.** `renderMdx`
 * passes its components centrally because it once passed none, and every fenced
 * block on all five surfaces came out an unhighlighted `<pre>`. A second map
 * written from scratch is that failure with more steps: it would be a map that
 * drifts one element at a time. Spreading keeps the property the central pass
 * was protecting, which is that no surface can render with less than the base
 * map, while letting one element differ deliberately.
 */
export const DOCUMENT_COMPONENTS = {
  ...PROSE_COMPONENTS,
  ol: ({ children }: { children?: ReactNode }) => (
    <helix-list kind="ordered" marker="rail">
      {children}
    </helix-list>
  ),
}
