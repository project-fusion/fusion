/**
 * The color and weight a run of a log line is drawn in, read from the ANSI
 * escape codes a terminal program writes.
 *
 * **Only Select Graphic Rendition is drawn.** Every other escape sequence, a
 * cursor move, a line erase, a window title, is taken out of the text and
 * dropped, because a log is a record of what was written and has no cursor
 * to move. A sequence cut off at the end of the text is dropped too.
 */

/** How one run of text is drawn. Absent fields are the log's own defaults. */
export interface LogStyle {
  /** The background: one of `ANSI_NAMES`, or a CSS color. */
  background?: string
  /** Bold, or bright on a terminal that draws it that way. */
  bold?: boolean
  /** The text color: one of `ANSI_NAMES`, or a CSS color. */
  color?: string
  /** Faint. */
  dim?: boolean
  /** Foreground and background swapped. */
  inverse?: boolean
  /** Italic. */
  italic?: boolean
  /** Struck through. */
  strike?: boolean
  /** Underlined. */
  underline?: boolean
}

/** A stretch of a line drawn one way. */
export interface LogRun extends LogStyle {
  /** The text, with every escape sequence taken out. */
  text: string
}

/**
 * The sixteen colors a terminal names, in the order SGR numbers them: the
 * eight at `30` to `37`, then their bright forms at `90` to `97`.
 *
 * A run in one of them carries the name, and is drawn in the `--log-ansi-`
 * color of that name, so the stylesheet says what red is in its theme. The
 * palette's own index above fifteen is a fact about the color and is carried
 * as the color itself.
 */
export const ANSI_NAMES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'bright-black',
  'bright-red',
  'bright-green',
  'bright-yellow',
  'bright-blue',
  'bright-magenta',
  'bright-cyan',
  'bright-white',
] as const

/** One of the sixteen named colors, by its SGR index. */
const named = (index: number): string => ANSI_NAMES[index] ?? 'white'

/** The steps of the 6 by 6 by 6 cube in the 256-color palette. */
const CUBE = [0, 95, 135, 175, 215, 255] as const

/**
 * Entry `index` of the 256-color palette: a name below 16, and the CSS color
 * of the cube to 231 and of the ramp of grays from 232 to 255.
 */
export const paletteColor = (index: number): string | undefined => {
  if (!Number.isInteger(index) || index < 0 || index > 255) {
    return undefined
  }
  if (index < 16) {
    return named(index)
  }
  if (index < 232) {
    const cube = index - 16
    const red = CUBE[Math.floor(cube / 36)]
    const green = CUBE[Math.floor(cube / 6) % 6]
    const blue = CUBE[cube % 6]
    return `rgb(${red} ${green} ${blue})`
  }
  const gray = 8 + (index - 232) * 10
  return `rgb(${gray} ${gray} ${gray})`
}

/**
 * Reads the color an extended code names, `38;5;n` or `38;2;r;g;b` and their
 * background twins, starting at the `5` or the `2`. Returns the color and how
 * many parameters it took, or a step past a form it does not know.
 */
const extended = (
  codes: readonly number[],
  at: number,
): { color: string | undefined; used: number } => {
  const form = codes[at]
  if (form === 5) {
    return { color: paletteColor(codes[at + 1] ?? -1), used: 2 }
  }
  if (form === 2) {
    const [red, green, blue] = [codes[at + 1], codes[at + 2], codes[at + 3]]
    const valid = [red, green, blue].every(
      (value) => value !== undefined && Number.isInteger(value) && value >= 0 && value <= 255,
    )
    return { color: valid ? `rgb(${red} ${green} ${blue})` : undefined, used: 4 }
  }
  return { color: undefined, used: 1 }
}

/** The style `codes` leave behind, applied over `style`. */
export const applySgr = (style: LogStyle, codes: readonly number[]): LogStyle => {
  const next: LogStyle = { ...style }
  /* `ESC[m` is a reset, as `ESC[0m` is. */
  const list = codes.length === 0 ? [0] : codes
  for (let at = 0; at < list.length; at += 1) {
    const code = list[at] ?? 0
    if (code === 0) {
      for (const key of Object.keys(next)) {
        delete next[key as keyof LogStyle]
      }
    } else if (code === 1) {
      next.bold = true
    } else if (code === 2) {
      next.dim = true
    } else if (code === 3) {
      next.italic = true
    } else if (code === 4) {
      next.underline = true
    } else if (code === 7) {
      next.inverse = true
    } else if (code === 9) {
      next.strike = true
    } else if (code === 22) {
      delete next.bold
      delete next.dim
    } else if (code === 23) {
      delete next.italic
    } else if (code === 24) {
      delete next.underline
    } else if (code === 27) {
      delete next.inverse
    } else if (code === 29) {
      delete next.strike
    } else if (code >= 30 && code <= 37) {
      next.color = named(code - 30)
    } else if (code === 38 || code === 48) {
      const { color, used } = extended(list, at + 1)
      if (color !== undefined) {
        next[code === 38 ? 'color' : 'background'] = color
      }
      at += used
    } else if (code === 39) {
      delete next.color
    } else if (code >= 40 && code <= 47) {
      next.background = named(code - 40)
    } else if (code === 49) {
      delete next.background
    } else if (code >= 90 && code <= 97) {
      next.color = named(code - 90 + 8)
    } else if (code >= 100 && code <= 107) {
      next.background = named(code - 100 + 8)
    }
  }
  return next
}

/** Whether a style draws anything a plain run does not. */
const plain = (style: LogStyle): boolean => Object.keys(style).length === 0

/** Whether two styles draw the same, the text of a run aside. */
const same = (a: LogStyle, b: LogStyle): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  keys.delete('text')
  for (const key of keys) {
    if (a[key as keyof LogStyle] !== b[key as keyof LogStyle]) {
      return false
    }
  }
  return true
}

/**
 * Matches one escape sequence: CSI (`ESC [` up to a final byte), OSC (`ESC ]`
 * up to BEL or `ESC \`), and any other two-byte escape. The 8-bit CSI, `0x9b`,
 * is read as `ESC [`.
 */
const SEQUENCE =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: these are the escape codes being parsed
  /(?:\x1b\[|\x9b)([0-?]*)[ -/]*([@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g

/** An escape sequence cut off at the end of the text, which is dropped. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: these are the escape codes being parsed
const UNFINISHED = /(?:\x1b(?:\[[0-?]*[ -/]*|\][^\x07]*)?|\x9b[0-?]*[ -/]*)$/

/**
 * Splits one line of text into runs, starting from `style`, and says what
 * style the line ends in, which is where the next line starts.
 *
 * A run with no style left is plain. Adjacent runs that draw the same are
 * merged, so a line that resets to the style it already had stays one run.
 */
export const parseAnsi = (
  text: string,
  style: LogStyle = {},
): { runs: LogRun[]; style: LogStyle } => {
  const runs: LogRun[] = []
  let current = style
  let from = 0
  const push = (chunk: string): void => {
    if (chunk === '') {
      return
    }
    const last = runs.at(-1)
    if (last && same(last, current)) {
      last.text += chunk
    } else {
      runs.push(plain(current) ? { text: chunk } : { ...current, text: chunk })
    }
  }
  const body = text.replace(UNFINISHED, '')
  for (const match of body.matchAll(SEQUENCE)) {
    push(body.slice(from, match.index))
    from = match.index + match[0].length
    const [, parameters, final] = match
    if (final === 'm' && parameters !== undefined && !/[<=>?]/.test(parameters)) {
      current = applySgr(
        current,
        parameters === '' ? [] : parameters.split(/[;:]/).map((code) => Number(code || 0)),
      )
    }
  }
  push(body.slice(from))
  return { runs, style: current }
}

/** The text of a line with every escape sequence taken out. */
export const stripAnsi = (text: string): string =>
  text.replace(UNFINISHED, '').replace(SEQUENCE, '')
