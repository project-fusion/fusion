import type { CSSResult, ReactiveController, ReactiveControllerHost } from 'lit'

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

/** The page's registration, the consumers on it, and every sheet a registration has given them. */
interface Registry {
  consumers: Set<HighlighterConsumer>
  registered: Registered | undefined
  sheets: Set<CSSStyleSheet>
}

/**
 * Where the registration is kept: on `globalThis`, so every copy of this
 * module on a page reads the one a page made. A chunk loaded later, such as
 * the one the site's preview frame loads for a Code Input, bundles a copy of
 * its own, and a variable here registered into that copy alone.
 */
const SLOT = Symbol.for('fusion.dev/helix/highlighter')

const store = globalThis as { [SLOT]?: Registry }
store[SLOT] ??= { consumers: new Set(), registered: undefined, sheets: new Set() }
const registry = store[SLOT]

/** The highlighter a page registered, or nothing where it registered none. */
export const registeredHighlighter = (): CodeBlockHighlighter | undefined =>
  registry.registered?.highlighter

/** Gives a shadow root the registered sheet, in place of any an earlier registration gave it. */
const adoptSheet = (root: ShadowRoot | null | undefined): void => {
  if (!root) {
    return
  }
  const sheet = registry.registered?.sheet?.styleSheet
  const kept = root.adoptedStyleSheets.filter((one) => one === sheet || !registry.sheets.has(one))
  const next = sheet && !kept.includes(sheet) ? [...kept, sheet] : kept
  if (
    next.length !== root.adoptedStyleSheets.length ||
    next.some((one, at) => one !== root.adoptedStyleSheets[at])
  ) {
    root.adoptedStyleSheets = next
  }
}

/**
 * Keeps an element that draws with the registered highlighter on the page's
 * list while it is connected, with the registered sheet in its shadow root,
 * so a registration reaches it without searching the page.
 */
export class HighlighterController implements ReactiveController {
  constructor(private readonly host: ReactiveControllerHost & HighlighterConsumer) {
    host.addController(this)
  }

  hostConnected(): void {
    registry.consumers.add(this.host)
    adoptSheet(this.host.shadowRoot)
  }

  hostDisconnected(): void {
    registry.consumers.delete(this.host)
  }
}

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
  registry.registered = highlighter ? { highlighter, sheet } : undefined
  if (sheet?.styleSheet) {
    registry.sheets.add(sheet.styleSheet)
  }
  for (const consumer of registry.consumers) {
    if (!consumer.isConnected) {
      registry.consumers.delete(consumer)
      continue
    }
    adoptSheet(consumer.shadowRoot)
    consumer.highlighterChanged()
  }
}
