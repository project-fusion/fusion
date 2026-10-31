/**
 * Code in runs of one look each: the output a highlighter gives where nothing
 * can draw its markup, as a phone cannot, beside the HTML a Code Block's
 * `highlight` returns.
 *
 * **A highlighter's HTML stays the web's.** A `highlight` function returns
 * what it always did and the block draws it as it always did. `markupRuns`
 * reads that same HTML into runs, so one function serves a page and a phone,
 * and `tokens` hands the block runs directly, with no markup to escape.
 *
 * **Nothing here holds a grammar or a dependency.** `shikiTokens` takes a
 * highlighter the page made and reads only the method it names, so a page that
 * does not use Shiki pays for none of it.
 */

/** One stretch of code in one look. */
export interface CodeRun {
  /** The ground behind the words, as CSS. */
  readonly background?: string
  /** The words in bold. */
  readonly bold?: boolean
  /** The color of the words in a light scheme, and in both without `colorDark`, as CSS. */
  readonly color?: string
  /** The color of the words in a dark scheme, as CSS. */
  readonly colorDark?: string
  /** The words in italics. */
  readonly italic?: boolean
  /** A name of the theme's `--helix-color-syntax-*` tokens, which color the words in both schemes. */
  readonly syntax?: string
  /** The code, line breaks included. */
  readonly text: string
  /** The words underlined. */
  readonly underline?: boolean
}

/**
 * Turns code into runs for a `language`, or returns `undefined` for a language
 * it does not read, which the block then draws plain.
 */
export type CodeBlockTokens = (code: string, language: string) => readonly CodeRun[] | undefined

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

/** Markup's text as the code it stands for. */
const decoded = (text: string): string =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith('#')) {
      const digits = name.slice(1)
      const point = /^x/i.test(digits)
        ? Number.parseInt(digits.slice(1), 16)
        : Number.parseInt(digits, 10)
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole
    }
    return ENTITIES[name.toLowerCase()] ?? whole
  })

/** An attribute of a tag, by its name, decoded. */
const attribute = (tag: string, name: string): string | undefined => {
  const value = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  return value === null ? undefined : decoded(value[1] ?? value[2] ?? '')
}

type Look = Omit<CodeRun, 'text'>

/** What a tag's inline style says of the look. */
const styleLook = (style: string): Look => {
  const look: { -readonly [Key in keyof Look]: Look[Key] } = {}
  for (const declaration of style.split(';')) {
    const at = declaration.indexOf(':')
    const name = declaration.slice(0, at).trim().toLowerCase()
    const value = declaration.slice(at + 1).trim()
    if (at <= 0 || value === '') {
      continue
    }
    if (name === 'color') {
      look.color = value
    } else if (name === 'background-color' || name === 'background') {
      look.background = value
    } else if (name === 'font-weight') {
      look.bold = value === 'bold' || Number(value) >= 600
    } else if (name === 'font-style') {
      look.italic = value === 'italic'
    } else if (name === 'text-decoration' || name === 'text-decoration-line') {
      look.underline = value.includes('underline')
    }
  }
  return look
}

/** What the classes of Helix's own highlighter say: a token of the theme, and a comment's italics. */
const syntaxLook = (classes: string): Look => {
  const syntax = /(?:^|\s)helix-syntax-([a-z]+)/.exec(classes)?.[1]
  return syntax === undefined ? {} : { syntax, ...(syntax === 'comment' ? { italic: true } : {}) }
}

/** What a tag says of the look of the words it holds. */
const tagLook = (name: string, tag: string): Look => ({
  ...syntaxLook(attribute(tag, 'class') ?? ''),
  ...(name === 'b' || name === 'strong' ? { bold: true } : {}),
  ...(name === 'i' || name === 'em' ? { italic: true } : {}),
  ...(name === 'u' ? { underline: true } : {}),
  ...styleLook(attribute(tag, 'style') ?? ''),
})

/**
 * What a highlighter's markup says, as runs: the look its tags give each
 * stretch, read from `b`, `strong`, `i`, `em`, `u`, an inline `style`, and a
 * `helix-syntax-*` class. Any other class says nothing here, as a page's sheet
 * colors it and a phone has no sheet to ask, so words under it are plain.
 */
export const markupRuns = (markup: string): CodeRun[] => {
  const runs: CodeRun[] = []
  const open: Array<{ look: Look; name: string }> = []
  for (const [, tag, text] of markup.matchAll(/(<[^>]*>)|([^<]+)/g)) {
    if (text !== undefined) {
      const look = Object.assign({}, ...open.map((one) => one.look)) as Look
      runs.push({ ...look, text: decoded(text) })
      continue
    }
    const name = /^<\/?([A-Za-z][\w-]*)/.exec(tag ?? '')?.[1]?.toLowerCase()
    if (name === undefined || tag?.endsWith('/>') === true) {
      continue
    }
    if (tag?.startsWith('</') === true) {
      const at = open.map((one) => one.name).lastIndexOf(name)
      if (at >= 0) {
        open.splice(at)
      }
    } else {
      open.push({ look: tagLook(name, tag ?? ''), name })
    }
  }
  return runs
}

/** Code as markup a browser draws. */
const escaped = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A value as it stands inside a `style` attribute. */
const quoted = (value: string): string => value.replace(/"/g, '&quot;').replace(/;/g, '')

/** The color a run's words are written in, as CSS. */
const colorOf = (run: CodeRun): string | undefined => {
  if (run.syntax !== undefined) {
    return `var(--helix-color-syntax-${run.syntax})`
  }
  return run.color !== undefined && run.colorDark !== undefined
    ? `light-dark(${run.color}, ${run.colorDark})`
    : (run.color ?? run.colorDark)
}

/**
 * Runs as the markup the web's block draws: one span for each run with a look,
 * in the page's own text elsewhere, each value in an inline style.
 */
export const runsMarkup = (runs: readonly CodeRun[]): string =>
  runs
    .map((run) => {
      const color = colorOf(run)
      const style = [
        color === undefined ? '' : `color:${quoted(color)}`,
        run.background === undefined ? '' : `background-color:${quoted(run.background)}`,
        run.bold === true ? 'font-weight:bold' : '',
        run.italic === true ? 'font-style:italic' : '',
        run.underline === true ? 'text-decoration:underline' : '',
      ]
        .filter(Boolean)
        .join(';')
      return style === ''
        ? escaped(run.text)
        : `<span style="${style}">${escaped(run.text)}</span>`
    })
    .join('')

/** What `shikiTokens` reads of one token's look in one theme. */
interface ShikiLook {
  readonly color?: string
  readonly fontStyle?: number
}

/** What `shikiTokens` reads of a highlighter Shiki's `createHighlighterCore` made. */
export interface ShikiLike {
  readonly codeToTokensWithThemes: (
    code: string,
    options: { readonly lang: string; readonly themes: Readonly<Record<string, string>> },
  ) => ReadonlyArray<
    ReadonlyArray<{
      readonly content: string
      readonly variants: Readonly<Record<string, ShikiLook>>
    }>
  >
  readonly getLoadedLanguages: () => readonly string[]
}

/* Shiki's font style is a set of bits, its own `FontStyle`. */
const ITALIC = 1
const BOLD = 2
const UNDERLINE = 4

/**
 * Runs from a highlighter the page made with Shiki, colored for both schemes.
 *
 * **On Hermes, make it with Shiki's JavaScript regular expression engine**,
 * `createJavaScriptRegexEngine({ target: 'ES2018' })`, as Hermes has no
 * WebAssembly and no `v` flag. Shiki stays the page's dependency.
 *
 * Reads `light` and `dark` from `themes`, each a theme the highlighter loaded.
 */
export const shikiTokens =
  (
    highlighter: ShikiLike,
    themes: { readonly dark: string; readonly light: string },
  ): CodeBlockTokens =>
  (code, language) => {
    if (!highlighter.getLoadedLanguages().includes(language)) {
      return undefined
    }
    const lines = highlighter.codeToTokensWithThemes(code, { lang: language, themes })
    const runs: CodeRun[] = []
    lines.forEach((line, at) => {
      if (at > 0) {
        runs.push({ text: '\n' })
      }
      for (const token of line) {
        const light = token.variants.light
        const style = light?.fontStyle ?? 0
        runs.push({
          ...(light?.color === undefined ? {} : { color: light.color }),
          ...(token.variants.dark?.color === undefined
            ? {}
            : { colorDark: token.variants.dark.color }),
          ...(style & BOLD ? { bold: true } : {}),
          ...(style & ITALIC ? { italic: true } : {}),
          ...(style & UNDERLINE ? { underline: true } : {}),
          text: token.content,
        })
      }
    })
    return runs
  }

/** The tokens a page registered, and who hears a change, where every copy of this module reads one. */
interface TokensRegistry {
  readonly heard: Set<() => void>
  tokens: CodeBlockTokens | undefined
}

const SLOT = Symbol.for('fusion.dev/helix/code-tokens')
const store = globalThis as { [SLOT]?: TokensRegistry }
store[SLOT] ??= { heard: new Set(), tokens: undefined }
const registry = store[SLOT]

/** The tokens a page registered, or nothing where it registered none. */
export const registeredTokens = (): CodeBlockTokens | undefined => registry.tokens

/** Hears `registerTokens`, until the function it returns is called. */
export const hearTokens = (heard: () => void): (() => void) => {
  registry.heard.add(heard)
  return () => {
    registry.heard.delete(heard)
  }
}

/**
 * Gives every Code Block that sets no `highlight` or `tokens` of its own runs
 * of code, on a page and on a phone. `undefined` takes them away again.
 *
 * Opt-in, as `registerHighlighter` is, so plain code carries no grammar. On a
 * page, a highlighter `registerHighlighter` gave wins over this.
 */
export const registerTokens = (tokens: CodeBlockTokens | undefined): void => {
  registry.tokens = tokens
  for (const heard of registry.heard) {
    heard()
  }
}
