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
