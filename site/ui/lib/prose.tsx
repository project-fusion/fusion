import { type HighlightLanguage, highlight } from '@helix-io/sandbox/highlight'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

/**
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
 * Two things do not map, and both are the absence of a component rather than a
 * decision:
 *
 * - **`a`**, because there is no Link family. Links are a base-layer recipe
 *   keyed `data-link`, so the anchor carries the attribute and takes the same
 *   rule every other link on the site takes.
 * - **`del`**, which is GFM strikethrough and has nothing to be.
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

/**
 * The table itself, in the wrapper that lets it scroll.
 *
 * The same wrapper the API reference tables use, and for the same reason: a
 * column holding a type union is wider than any measure, and a table that
 * squeezes to fit is one nobody can read. The component owns the alignment; the
 * page owns whether it may overflow.
 *
 * No `label`. A markdown table has no caption to take one from, and inventing
 * one would put a name on the table that the page never says out loud.
 */
const Table = ({ children }: { children?: ReactNode }) => (
  <div data-prose-table>
    <helix-table>{children}</helix-table>
  </div>
)

/** `thead` and `tbody` are grouping this grid does not have. */
const Unwrap = ({ children }: { children?: ReactNode }) => children

/** A heading, at the level markdown asked for. */
const heading = (as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
  function Heading({ children }: { children?: ReactNode }) {
    return <helix-text as={as}>{children}</helix-text>
  }

/** The map handed to every `renderMdx` call. */
export const PROSE_COMPONENTS = {
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
