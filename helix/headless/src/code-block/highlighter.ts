import type { CSSResult } from 'lit'

/**
 * Turns code into highlighted markup for a `language`, or returns `undefined`
 * for a language it does not read, which the element then draws plain.
 */
export type CodeBlockHighlighter = (code: string, language: string) => string | undefined

/**
 * An element that draws with the registered highlighter: Code Block and Code
 * Input. Told when the registration changes, so it draws again.
 */
export interface HighlighterConsumer extends Element {
  highlighterChanged(): void
}

/** What a page registered: the highlighter and its sheet. */
interface Registered {
  highlighter: CodeBlockHighlighter
  sheet: CSSResult | undefined
}

/**
 * Where the registration is kept: on `globalThis`, so every copy of this
 * module on a page reads the one a page made. A chunk loaded later, such as
 * the one the site's preview frame loads for a Code Input, bundles a copy of
 * its own, and a variable here registered into that copy alone.
 */
const SLOT = Symbol.for('fusion.dev/helix/highlighter')

const store = globalThis as { [SLOT]?: Registered | undefined }

/** The highlighter a page registered, or nothing where it registered none. */
export const registeredHighlighter = (): CodeBlockHighlighter | undefined =>
  store[SLOT]?.highlighter

/** Gives a shadow root the registered sheet, once. */
export const adoptHighlighterSheet = (root: ShadowRoot | null | undefined): void => {
  const sheet = store[SLOT]?.sheet?.styleSheet
  if (root && sheet && !root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
  }
}

/** Whether an element draws with the registered highlighter. */
const isConsumer = (node: Element): node is HighlighterConsumer =>
  typeof (node as Partial<HighlighterConsumer>).highlighterChanged === 'function'

/** The consumers already on the page, in the document and in every open shadow root in it. */
const consumersOnPage = (root: ParentNode = document): HighlighterConsumer[] =>
  [...root.querySelectorAll('*')].flatMap((node) => [
    ...(isConsumer(node) ? [node] : []),
    ...(node.shadowRoot ? consumersOnPage(node.shadowRoot) : []),
  ])

/**
 * Gives every Code Block and Code Input of both tiers a highlighter, for the
 * ones that set no `highlight` of their own, and the sheet that colors what
 * it returns.
 *
 * **Opt-in, so a page that shows plain code carries no grammar.** Helix ships
 * none: a grammar is the larger part of any highlighter, and an element that
 * registers one for every page makes every page pay for it. A page that wants
 * color calls this once, or imports an entry that calls it, such as
 * `@fusion.dev/helix-sandbox/code-block`. `sheet` is adopted into every
 * consumer's shadow root, for a highlighter that writes classes, since a
 * page's own stylesheet does not reach inside one.
 *
 * An element's own `highlight` wins over this. Elements already on the page
 * draw again with it, and every element built after has it. `undefined` takes
 * it away again.
 */
export const registerHighlighter = (
  highlighter: CodeBlockHighlighter | undefined,
  sheet?: CSSResult,
): void => {
  store[SLOT] = highlighter ? { highlighter, sheet } : undefined
  /* Asked of the method: under Lit's global DOM shim a server has a
     `document` with no `querySelectorAll`, and the walk threw at import. */
  if (typeof globalThis.document?.querySelectorAll === 'function') {
    for (const consumer of consumersOnPage()) {
      adoptHighlighterSheet(consumer.shadowRoot)
      consumer.highlighterChanged()
    }
  }
}
