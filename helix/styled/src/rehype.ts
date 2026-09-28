/**
 * **A rehype plugin that gives Markdown's two missing constructs their Helix
 * elements, and parses nothing.** Your Markdown library turns `###` into
 * `<h3>`, and `data-prose` styles the HTML it writes. Two constructs carry
 * what plain HTML cannot: a code fence, which a reader copies and which has a
 * language, and a GitHub alert, which says how much a passage matters. This
 * rewrites those two in the tree your parser already built, after your own
 * sanitizing, and leaves everything else as it is.
 *
 * - A fence becomes `helix-code-block`, labeled with its language. What is
 *   inside the code is kept, so a highlighter that ran before this has its
 *   colors kept too.
 * - An alert, `> [!NOTE]` through `> [!CAUTION]`, becomes `helix-callout`: a
 *   note is `info`, a tip `success`, a warning `warning`, and a caution
 *   `danger`. An important passage has no tone, since none of the four says
 *   it. Each keeps its kind as its heading, as GitHub shows it.
 *
 * Any pipeline that reaches rehype takes it: `remark` with `remark-rehype`,
 * `react-markdown`, and MDX.
 *
 * ```js
 * import rehypeHelix from '@fusion.dev/helix/rehype'
 *
 * unified().use(remarkParse).use(remarkRehype).use(rehypeHelix).use(rehypeStringify)
 * ```
 */

/** A node of the HTML tree, as far as this plugin reads one. */
interface HastNode {
  children?: HastNode[]
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

/** The five kinds of GitHub alert. */
export type AlertKind = 'caution' | 'important' | 'note' | 'tip' | 'warning'

/** What the plugin rewrites, and what it calls each alert. */
export interface RehypeHelixOptions {
  /** Whether alerts become callouts. `true` by default. */
  alerts?: boolean | undefined
  /**
   * Whether fences become code blocks. `true` by default; `false` where the
   * page draws its own fences, as a site that highlights them itself does.
   */
  fences?: boolean | undefined
  /** An alert's heading by its kind, for a page in another language. English by default. */
  headings?: Partial<Record<AlertKind, string>> | undefined
}

/** Each alert's tone, where one of the four says it. */
const TONES: Record<AlertKind, 'danger' | 'info' | 'success' | 'warning' | undefined> = {
  caution: 'danger',
  important: undefined,
  note: 'info',
  tip: 'success',
  warning: 'warning',
}

const HEADINGS: Record<AlertKind, string> = {
  caution: 'Caution',
  important: 'Important',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
}

/** An alert's marker, alone at the start of its first line, as GitHub writes it. */
const MARKER = /^\s*\[!(caution|important|note|tip|warning)\][ \t]*(?:\r?\n|$)/i

/** Whether a node is text of nothing but whitespace, which a tree keeps between elements. */
const blank = (node: HastNode): boolean => node.type === 'text' && !node.value?.trim()

/** The node's element children, the whitespace between them left out. */
const elements = (node: HastNode): HastNode[] =>
  (node.children ?? []).filter((child) => !blank(child))

/** A fence's language, from the `language-*` class a parser puts on its code. */
const languageOf = (code: HastNode): string | undefined => {
  const names = code.properties?.className
  const list = Array.isArray(names) ? names : typeof names === 'string' ? names.split(/\s+/) : []
  const found = list.find((name) => typeof name === 'string' && name.startsWith('language-'))
  return typeof found === 'string' ? found.slice('language-'.length) : undefined
}

/**
 * A fence as a code block, or nothing where the node is not a fence: a `pre`
 * holding one `code` and nothing else. The one newline a parser leaves at the
 * end of a fence is dropped, as it would draw an empty last line.
 */
const codeBlockOf = (node: HastNode): HastNode | undefined => {
  const inside = elements(node)
  const code = inside[0]
  if (node.tagName !== 'pre' || inside.length !== 1 || code?.tagName !== 'code') {
    return undefined
  }
  const children = [...(code.children ?? [])]
  const last = children.at(-1)
  if (last?.type === 'text' && last.value?.endsWith('\n')) {
    children[children.length - 1] = { ...last, value: last.value.slice(0, -1) }
  }
  const language = languageOf(code)
  return {
    children,
    properties: language ? { label: language } : {},
    tagName: 'helix-code-block',
    type: 'element',
  }
}

/**
 * An alert as a callout, or nothing where the node is not an alert: a
 * `blockquote` whose first paragraph starts with the marker. The marker is
 * taken out, and the paragraph with it where it held nothing else.
 */
const calloutOf = (node: HastNode, headings: Record<AlertKind, string>): HastNode | undefined => {
  if (node.tagName !== 'blockquote') {
    return undefined
  }
  const inside = elements(node)
  const first = inside[0]
  const text = first?.tagName === 'p' ? first.children?.[0] : undefined
  const match = text?.type === 'text' ? MARKER.exec(text.value ?? '') : null
  if (!first || !text || !match) {
    return undefined
  }
  const kind = (match[1] ?? '').toLowerCase() as AlertKind
  const rest = (text.value ?? '').slice(match[0].length)
  const paragraph: HastNode = {
    ...first,
    children: [...(rest ? [{ ...text, value: rest }] : []), ...(first.children ?? []).slice(1)],
  }
  /* A line break the parser drew after the marker leads nothing now. */
  if (paragraph.children?.[0]?.tagName === 'br') {
    paragraph.children = paragraph.children.slice(1)
  }
  const body = [...(elements(paragraph).length > 0 ? [paragraph] : []), ...inside.slice(1)]
  const tone = TONES[kind]
  return {
    children: [
      {
        children: [{ type: 'text', value: headings[kind] }],
        properties: { slot: 'heading' },
        tagName: 'span',
        type: 'element',
      },
      ...body,
    ],
    properties: tone ? { tone } : {},
    tagName: 'helix-callout',
    type: 'element',
  }
}

/**
 * The plugin: rewrites the tree in place, from the top down, so a fence
 * inside an alert becomes a code block inside a callout.
 */
export default function rehypeHelix(options: RehypeHelixOptions = {}) {
  const headings = { ...HEADINGS, ...options.headings }
  const rewrite = (node: HastNode): void => {
    const children = node.children
    if (!children) {
      return
    }
    children.forEach((child, index) => {
      const replaced =
        (options.fences !== false ? codeBlockOf(child) : undefined) ??
        (options.alerts !== false ? calloutOf(child, headings) : undefined)
      if (replaced) {
        children[index] = replaced
      }
      rewrite(children[index] as HastNode)
    })
  }
  return (tree: HastNode): void => {
    rewrite(tree)
  }
}

export { rehypeHelix }
