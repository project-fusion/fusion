import { type HighlightLanguage, highlight } from '@helix-io/sandbox/highlight'
import type { ReactElement, ReactNode } from 'react'

/**
 * What MDX renders its blocks as, for every prose surface on this site.
 *
 * **MDX was rendering bare HTML and nothing was mapping it.** `renderMdx` took
 * no components, so a fenced block came out as `<pre><code>` with no
 * highlighting and no way to take the code, on two hundred and fifty-three
 * fences across the documentation, while `helix-code-block` and a build-time
 * highlighter were already shipping on every component page. The base layer was
 * carrying the rest through `[data-prose]`, which is what made the gap invisible:
 * the pages looked deliberate rather than unmapped.
 *
 * **Most elements still map to nothing, and that is the design rather than the
 * remainder.** `.claude/rules/helix.md` puts headings, links, paragraphs and
 * inline code in the base layer as `[data-prose]` helpers, and there is no
 * Heading or Link family to reach for: a shadow rule loses to a document rule
 * whatever its specificity, so a component here could not win against the base
 * layer even if one existed. What belongs in a component is what carries
 * behaviour, state or API, which is the same test that decides whether a region
 * becomes an element. A code block has all three. A paragraph has none.
 *
 * So exactly two elements map, and both earn it:
 *
 * - **`pre`** becomes `helix-code-block`, which brings the copy button, the
 *   name bar, and its own overflow. The highlighting is a Lezer parse from
 *   `@helix-io/sandbox/highlight`, run here at build: nothing is mounted, no
 *   document is created, and the page ships coloured markup with no client
 *   JavaScript spent on it. A snippet in the docs and the same snippet open in
 *   the sandbox are then coloured by one grammar rather than two that agree by
 *   coincidence.
 * - **`blockquote`** becomes `helix-blockquote`, which is the component whose
 *   entire job is this element.
 *
 * **Tables are deliberately left alone**, and this is the one that looks like an
 * omission. `helix-table` is a grid of `helix-table-column` and
 * `helix-table-row` siblings, and GFM emits `thead > tr > th`: mapping one onto
 * the other means collapsing two levels of nesting through React context, and
 * then every column is `auto` because markdown has nowhere to write a width. The
 * component is built for data a page controls the shape of. What these tables
 * need is to scroll rather than squeeze, which is nine lines of CSS that already
 * exist and do not need a component to hold them.
 */

/** Fence languages the highlighter has a grammar for, by what authors write. */
const GRAMMARS: Record<string, HighlightLanguage> = {
  css: 'css',
  html: 'html',
  js: 'js',
  json: 'js',
  jsx: 'tsx',
  svelte: 'html',
  ts: 'ts',
  tsx: 'tsx',
  vue: 'html',
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
 * renders its text as a child rather than as markup: `sh` and `text` and the
 * hundred and thirty-three unlabelled ones are code, they are just not code
 * anything here can parse, and passing them through the highlighter would hand
 * back the input with no spans in it while claiming otherwise.
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

/** The map handed to every `renderMdx` call. */
export const PROSE_COMPONENTS = {
  blockquote: ({ children }: { children?: ReactNode }) => (
    <helix-blockquote>{children}</helix-blockquote>
  ),
  pre: CodeFence,
}
