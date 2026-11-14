/*
 * What a sandbox's panes and bars read the same on both platforms: a source's
 * runs made safe to draw and cut into lines, a status bar's readouts, and the
 * levels a console keeps. The web's elements read them, and a phone draws its
 * read-only sandbox from them.
 */

import { formatMessage } from '../../words/index.js'

/** One run of source text, and the kind of token it is. */
export interface SandboxToken {
  /**
   * What the run is: `callable`, `comment`, `constant`, `invalid`, `keyword`,
   * `name`, `string` or `tag`, which each have a color. Absent for text that is
   * not a token, such as spaces and punctuation.
   */
  kind?: string | undefined
  /** The text of the run, exactly as the source has it. */
  text: string
}

/**
 * Splits a pane's source into runs, for `SandboxSource.tokenize`.
 *
 * Takes the source and the pane's `name`, such as `html` or `css`, so one
 * function can serve every pane.
 */
export type SandboxTokenizer = (source: string, name: string) => readonly SandboxToken[]

/** A run as the pane draws it: its text, and its kind as an attribute holds it. */
export interface DrawnRun {
  /** The kind, in lowercase letters, digits and hyphens, or `undefined` for plain text. */
  kind: string | undefined
  /** The text of the run. */
  text: string
}

/**
 * The runs a highlighter gave, made safe to draw over the field.
 *
 * **Drawn under the text the reader types, so the two must match exactly.** The
 * runs are laid out behind a transparent field, and one character dropped or
 * added moves every line after it away from the caret. So runs whose text does
 * not add up to the source are not drawn as given: the source is drawn as one
 * plain run instead, which loses the colors and keeps the caret honest.
 *
 * A kind is lowercased and anything but letters, digits and hyphens in it is
 * a hyphen, so the stylesheet's eight kinds match however a highlighter
 * spells them, and nothing else it writes reaches an attribute.
 */
export const drawnRuns = (source: string, runs: readonly SandboxToken[]): DrawnRun[] => {
  if (runs.map((run) => run.text).join('') !== source) {
    return [{ kind: undefined, text: source }]
  }
  return runs.map((run) => ({
    kind: run.kind ? run.kind.toLowerCase().replace(/[^a-z0-9-]/g, '-') : undefined,
    text: run.text,
  }))
}

/**
 * A source's runs as `tokenize` gives them, drawn safe, or the source as one
 * plain run where there is no `tokenize` or it throws. A throw is the page's
 * fault, so it is reported as an uncaught error and costs the reader nothing.
 */
export const sourceRuns = (
  source: string,
  name: string,
  tokenize: SandboxTokenizer | undefined,
): DrawnRun[] => {
  let given: readonly SandboxToken[] = []
  try {
    given = tokenize?.(source, name) ?? []
  } catch (error) {
    globalThis.reportError?.(error)
  }
  return drawnRuns(source, given)
}

/** Runs of text cut at each line break, a line to an array, with a run's other fields kept. */
export const linesOfRuns = <Run extends SandboxToken>(runs: readonly Run[]): Run[][] => {
  const lines: Run[][] = [[]]
  for (const run of runs) {
    run.text.split('\n').forEach((piece, at) => {
      if (at > 0) {
        lines.push([])
      }
      if (piece !== '' || (run as { mark?: string }).mark === 'anchor') {
        lines.at(-1)?.push({ ...run, text: piece })
      }
    })
  }
  return lines
}

/** The names a status bar writes for the languages an editor knows. */
const LANGUAGES: Readonly<Record<string, string>> = {
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  tsx: 'TSX',
}

/**
 * A language as a status bar writes it: its name where an editor knows it,
 * since `html` in a status bar reads as a variable name where `HTML` reads as
 * a language, and the word as given where it does not, so a consumer naming
 * their own language is not blanked.
 *
 * **`Object.hasOwn`, never a truthy index.** An index reaches
 * `Object.prototype`, so `constructor` would write the whole source of
 * `Object` where the word itself belongs.
 */
export const languageName = (language: string): string =>
  Object.hasOwn(LANGUAGES, language) ? (LANGUAGES[language] as string) : language

/**
 * Where the caret is, as a status bar says it, or `undefined` without both a
 * line and a column. `{line}` and `{column}` are written as an editor writes
 * them, without grouping.
 */
export const caretWords = (
  label: string,
  line: number | undefined,
  column: number | undefined,
  locale = '',
): string | undefined =>
  line === undefined || column === undefined
    ? undefined
    : formatMessage(label, { column: String(column), line: String(line) }, locale)

/** A console's levels, in the order its filter lists them. */
export const CONSOLE_LEVELS = ['log', 'info', 'warn', 'error'] as const

/** One of a console's levels. */
export type ConsoleLevel = (typeof CONSOLE_LEVELS)[number]

/** The lines a console keeps, the oldest dropped past them. */
export const CONSOLE_LIMIT = 200

/** The lines a console's live region keeps, so a burst is not read as a backlog. */
export const CONSOLE_HEARD = 5
