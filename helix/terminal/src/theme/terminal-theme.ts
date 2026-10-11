import { readColorAlpha } from '@fusion.dev/helix-core'

/**
 * The colors a terminal is drawn in, each `#rrggbb`, or `rgba()` where it is
 * see-through, by the names xterm.js's theme gives them, which other
 * emulators' themes share. A color the frame does not set is left out, and
 * the renderer keeps its own.
 */
export interface TerminalColors {
  background?: string
  black?: string
  blue?: string
  brightBlack?: string
  brightBlue?: string
  brightCyan?: string
  brightGreen?: string
  brightMagenta?: string
  brightRed?: string
  brightWhite?: string
  brightYellow?: string
  cursor?: string
  /** The character under a block cursor, which is the ground. */
  cursorAccent?: string
  cyan?: string
  foreground?: string
  green?: string
  magenta?: string
  red?: string
  scrollbarSliderActiveBackground?: string
  scrollbarSliderBackground?: string
  scrollbarSliderHoverBackground?: string
  selectionBackground?: string
  /** The selection while the terminal does not have focus: the same ground, quieter. */
  selectionInactiveBackground?: string
  white?: string
  yellow?: string
}

/** The face a terminal is drawn in. */
export interface TerminalFont {
  /** The family, as a CSS font stack. */
  family: string
  /** The size of the text, in CSS pixels. */
  size: number
}

/** The colors a search highlights its matches in, each `#rrggbb`, which is all xterm.js takes for them. */
export interface TerminalMatches {
  /** The ground of the current match, where the frame sets one. */
  activeBackground?: string | undefined
  /** The edge of the current match. */
  activeBorder: string
  /** The ground of every other match, where the frame sets one. */
  background?: string | undefined
  /** Where each match is marked beside the scrollbar. */
  ruler: string
}

/** Everything a terminal is themed with: its colors, its face, and its search highlights. */
export interface TerminalTheme {
  colors: TerminalColors
  /** The viewport's face, where the frame has one to read. */
  font: TerminalFont | undefined
  matches: TerminalMatches
}

/** What the connector reads off a frame: the colors and the face, as its own properties resolve them. */
interface Looking extends Element {
  look(): {
    colors: Partial<Record<string, string>>
    font: TerminalFont | undefined
  }
}

const isFrame = (element: Element): element is Looking =>
  typeof (element as Partial<Looking>).look === 'function'

/** Two hex digits for a byte. */
const hex = (byte: number): string => Math.round(byte).toString(16).padStart(2, '0')

/**
 * A color the browser computed, as `#rrggbb`, or `rgba()` where it is
 * see-through, which every emulator's theme parses: a token computes to
 * `oklch()` or `lab()`, which they do not. `opaque` drops the alpha, for the
 * highlights xterm.js takes as hex alone, and `alpha` scales it.
 */
const settled = (computed: string, opaque = false, alpha = 1): string => {
  const read = readColorAlpha(computed)
  if (!read) {
    return computed
  }
  const [red, green, blue, own] = read
  const scaled = Math.round(own * alpha * 1000) / 1000
  return scaled === 1 || opaque
    ? `#${hex(red)}${hex(green)}${hex(blue)}`
    : `rgba(${red}, ${green}, ${blue}, ${scaled})`
}

/** The colors that are a slot of a theme of their own, read straight across. */
const STRAIGHT = [
  'background',
  'black',
  'blue',
  'brightBlack',
  'brightBlue',
  'brightCyan',
  'brightGreen',
  'brightMagenta',
  'brightRed',
  'brightWhite',
  'brightYellow',
  'cursor',
  'cyan',
  'foreground',
  'green',
  'magenta',
  'red',
  'white',
  'yellow',
] as const

/**
 * The theme a terminal frame asks for, read from the `--terminal-*` properties
 * where it is: on the styled tier, every color from your tokens, and on the
 * headless tier, whatever your page sets.
 *
 * **Resolved by the browser and then by a canvas**, as Map's colors are: a
 * token is `light-dark()` or a `color-mix()` that only the browser can settle
 * for the frame's color scheme, and what it settles to may be `oklch()`. Read
 * inside the frame, so a terminal in a dark pane of a light page is themed
 * dark.
 */
export const terminalThemeFrom = (frame: Element): TerminalTheme => {
  if (!isFrame(frame)) {
    throw new Error(
      `terminalThemeFrom: <${frame.localName}> is not a terminal frame. Import @fusion.dev/helix/terminal, and read the theme once the element is defined.`,
    )
  }
  const { colors: read, font } = frame.look()
  const colors: TerminalColors = {}
  for (const name of STRAIGHT) {
    const color = read[name]
    if (color) {
      colors[name] = settled(color)
    }
  }
  if (colors.background) {
    colors.cursorAccent = colors.background
  }
  if (read.selection) {
    colors.selectionBackground = settled(read.selection)
    colors.selectionInactiveBackground = settled(read.selection, false, 0.6)
  }
  if (read.scrollbar) {
    const thumb = settled(read.scrollbar)
    colors.scrollbarSliderActiveBackground = thumb
    colors.scrollbarSliderBackground = thumb
    colors.scrollbarSliderHoverBackground = thumb
  }
  /* xterm.js insists on an edge and a ruler for the current match, so they
     fall back to the ink where the frame sets neither, and to a mid gray where
     it sets no ink either. */
  const edge = read.activeMatchBorder ?? read.foreground
  const activeBorder = edge ? settled(edge, true) : '#808080'
  return {
    colors,
    font,
    matches: {
      activeBackground: read.activeMatch ? settled(read.activeMatch, true) : undefined,
      activeBorder,
      background: read.match ? settled(read.match, true) : undefined,
      ruler: activeBorder,
    },
  }
}

/**
 * The theme where it can be read, or `null` while it cannot, which is before
 * the frame is defined.
 */
export const terminalThemeNow = (frame: Element): TerminalTheme | null => {
  try {
    return terminalThemeFrom(frame)
  } catch {
    return null
  }
}

/**
 * The theme once the frame is defined and its face is loaded, which is what
 * to create the renderer with: an emulator measures its cells in the face it
 * is given when it opens, and a cell measured in the fallback face stays the
 * fallback's size.
 */
export const terminalThemeReady = async (frame: Element): Promise<TerminalTheme> => {
  if (!isFrame(frame) && typeof customElements !== 'undefined') {
    await customElements.whenDefined(frame.localName)
  }
  await (frame as Element & { updateComplete?: Promise<unknown> }).updateComplete
  const theme = terminalThemeFrom(frame)
  const font = theme.font
  if (font && typeof document !== 'undefined' && document.fonts) {
    await Promise.all(
      ['400', '700'].map((weight) =>
        document.fonts.load(`${weight} ${font.size}px ${font.family}`).catch(() => []),
      ),
    )
  }
  return theme
}
