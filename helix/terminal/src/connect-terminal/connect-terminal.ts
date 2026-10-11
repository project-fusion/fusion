import { reducedMotion, watchTheme } from '@fusion.dev/helix-core'
import { type TerminalTheme, terminalThemeNow } from '../theme/terminal-theme.js'

/** A grid's size in character cells. */
export interface TerminalGrid {
  columns: number
  rows: number
}

/** What the connector asks a renderer to apply, whatever renderer it is. */
export interface TerminalOptions {
  /**
   * The contrast every cell's text keeps against its ground, which the
   * renderer holds by adjusting the text's color, from `1`, which leaves
   * every color as the program wrote it, to `21`.
   */
  contrast: number
  /** Whether the cursor is drawn. */
  cursor: boolean
  /** Whether the reader's keys reach the program. */
  input: boolean
  /**
   * Whether the renderer may move by itself: blink its cursor and scroll
   * smoothly, where it was set to. Off when the reader asks for reduced motion.
   */
  motion: boolean
  /** Whether the renderer keeps an accessible copy of the grid and says new output. */
  screenReader: boolean
}

/** How a search through the output moves. */
export interface TerminalSearchOptions {
  /** Toward the top of the output, for the previous match. */
  backward: boolean
  /** Whether the reader is still typing, so the match in hand stays where it still matches. */
  incremental: boolean
}

/**
 * What a renderer has to answer for the frame to drive it, and nothing that is
 * the same for every renderer: that is the connector's.
 *
 * **Two methods are required**, writing output and hearing input, which is
 * the whole of a terminal. Each other method turns on what it is named for,
 * and the frame leaves out the control a renderer cannot answer.
 */
export interface TerminalDriver {
  /** Clears the scrollback, keeping the line the cursor is on. */
  clear?(): void
  /**
   * The element the renderer draws in, whose size the grid follows: the
   * connector refits the grid whenever it changes size.
   */
  element?(): HTMLElement | null | undefined
  /** Fits the grid to the renderer's element, as many cells as fit. The new size arrives through `onResize`. */
  fit?(): void
  /** Focuses the renderer's input. */
  focus?(): void
  /** The element that takes the reader's keys, which the frame names for a screen reader. */
  input?(): HTMLElement | null | undefined
  /** Hears the bell, and returns what stops it. */
  onBell?(rang: () => void): () => void
  /**
   * Hears what the reader types or pastes, encoded for the program, and
   * returns what stops it. `binary` marks data that holds one byte per
   * character.
   */
  onInput(input: (data: string, binary: boolean) => void): () => void
  /** Hears a link in the output activated, and returns what stops it and puts the renderer's own handling back. */
  onLink?(activated: (href: string) => void): () => void
  /** Hears the grid change size, and returns what stops it. */
  onResize?(resized: (grid: TerminalGrid) => void): () => void
  /** Hears the selection change, and returns what stops it. */
  onSelection?(changed: () => void): () => void
  /** Hears the program set its title, and returns what stops it. */
  onTitle?(changed: (title: string) => void): () => void
  /** Applies what the connector asks, as the frame's settings and the reader's preferences stand. */
  options?(options: TerminalOptions): void
  /** Inputs text as a paste does, in bracketed paste mode where the program asked for it. */
  paste?(text: string): void
  /** The grid's size in CSS pixels, which a pseudo-terminal's size takes beside its cells. */
  pixels?(): { height: number; width: number } | undefined
  /** Puts back everything the driver changed on the renderer. Called last, on disconnect. */
  release?(): void
  /** Resets the emulator: its modes, its colors, and its screen. */
  reset?(): void
  /** Sets the grid's size in cells, for a frame with `columns` and `rows`. */
  resize?(columns: number, rows: number): void
  /** Searches the output, highlighting the matches in `matches`' colors. */
  search?: {
    /** Takes the highlights off. */
    end(): void
    /** Finds the next or the previous match for `query`. */
    find(query: string, options: TerminalSearchOptions, matches: TerminalTheme['matches']): void
    /** Hears the matches change: the current one, counting from `0` or `-1` for none, and how many. */
    onResults(found: (index: number, count: number) => void): () => void
  }
  /** The text selected in the grid, or an empty string. */
  selection?(): string
  /** The grid's size in cells now. */
  size?(): TerminalGrid
  /** The grid as plain text: the lines on screen, or every line the scrollback holds. */
  text?(scope: 'all' | 'screen'): string
  /** Draws in the page's theme: its colors, its face, and its search highlights. */
  theme?(theme: TerminalTheme): void
  /** Writes the program's output, and calls `done` once it has been parsed. */
  write(data: string | Uint8Array, done: () => void): void
}

/** What a connection takes beyond the frame and the driver. */
export interface ConnectTerminalOptions {
  /**
   * The contrast every cell's text keeps against its ground: 4.5 by default,
   * WCAG's AA for text, which VS Code's terminal also holds. `1` leaves every
   * color as the program wrote it.
   */
  contrast?: number | undefined
}

/** A connection, which is ended rather than left to leak. */
export interface TerminalConnection {
  /** Stops answering the frame, detaches the renderer from it, and puts back everything connecting changed. */
  disconnect(): void
  /** Fits the grid to the frame now, for a page that resized it some way the connector cannot see. */
  fit(): void
}

/**
 * The frame as the connector reads it: `helix-terminal` or
 * `helix-headless-terminal`. Its own types are the headless tier's, held to
 * these by a spec, so this package depends on no tier.
 */
interface Frame extends HTMLElement {
  attach(renderer: Renderer): Sink
}

interface Renderer {
  clear?(): void
  find?(query: string, options: TerminalSearchOptions): void
  findEnd?(): void
  focus?(): void
  input?(): HTMLElement | null | undefined
  paste?(text: string): void
  reset?(): void
  selection?(): string
  settings?(settings: Settings): void
  text?(scope: 'all' | 'screen'): string
  write(data: string | Uint8Array, done: () => void): void
}

interface Settings {
  columns: number | undefined
  cursor: boolean
  input: boolean
  rows: number | undefined
  screenReader: boolean
}

interface Sink {
  bell(): void
  detach(): void
  found(index: number, count: number): void
  input(data: string, binary?: boolean): void
  link(href: string): void
  resized(size: { columns: number; height: number; rows: number; width: number }): void
  selected(any: boolean): void
  title(title: string): void
}

const isFrame = (element: HTMLElement): element is Frame =>
  typeof (element as Partial<Frame>).attach === 'function'

/** The contrast a cell's text keeps by default: WCAG's AA for text. */
const CONTRAST = 4.5

/**
 * Connects a Terminal frame to a renderer through its driver.
 *
 * **Everything that is the same for every renderer happens here**, once: the
 * frame's output reaches the renderer and the reader's input reaches the
 * frame; the grid is fitted to the frame and refitted as it changes size,
 * and the frame says the new size; the renderer is themed from the page's
 * tokens and themed again when the page's theme moves; the reader's request
 * for reduced motion stops the cursor blinking; and every cell keeps a
 * contrast floor against its ground.
 *
 * The frame is `helix-terminal` or `helix-headless-terminal`, and the driver is
 * `xtermDriver` or one of the page's own.
 */
export const connectTerminal = (
  frame: HTMLElement,
  driver: TerminalDriver,
  options: ConnectTerminalOptions = {},
): TerminalConnection => {
  if (!isFrame(frame)) {
    throw new Error(
      `connectTerminal: <${frame.localName}> is not a terminal frame. Import @fusion.dev/helix/terminal, and connect once the element is defined.`,
    )
  }
  const contrast = options.contrast ?? CONTRAST
  let live = true
  /* Set while the frame is first told, which calls `settings` at once: the
     size waits for the theme, since the face decides how many cells fit. */
  let starting = true
  let settings: Settings | undefined
  let theme: TerminalTheme | null = null
  const stops: (() => void)[] = []

  const applyOptions = (): void => {
    if (!settings) {
      return
    }
    driver.options?.({
      contrast,
      cursor: settings.cursor,
      input: settings.input,
      motion: !reducedMotion(),
      screenReader: settings.screenReader,
    })
  }

  /* The grid as the frame asks for it: a fixed size where it names both, and
     as many cells as fit otherwise. */
  const fixed = (): TerminalGrid | undefined =>
    settings?.columns !== undefined && settings.rows !== undefined
      ? { columns: settings.columns, rows: settings.rows }
      : undefined
  const size = (): void => {
    const grid = fixed()
    if (grid && driver.resize) {
      driver.resize(grid.columns, grid.rows)
    } else {
      driver.fit?.()
    }
  }

  const pixels = (): { height: number; width: number } => {
    const measured = driver.pixels?.()
    if (measured) {
      return measured
    }
    const box = driver.element?.()?.getBoundingClientRect()
    return { height: Math.round(box?.height ?? 0), width: Math.round(box?.width ?? 0) }
  }

  const renderer: Renderer = {
    settings: (next) => {
      settings = next
      applyOptions()
      if (live && !starting) {
        size()
      }
    },
    write: (data, done) => driver.write(data, done),
  }
  if (driver.clear) {
    renderer.clear = () => driver.clear?.()
  }
  if (driver.focus) {
    renderer.focus = () => driver.focus?.()
  }
  if (driver.input) {
    renderer.input = () => driver.input?.()
  }
  if (driver.paste) {
    renderer.paste = (text) => driver.paste?.(text)
  }
  if (driver.reset) {
    renderer.reset = () => driver.reset?.()
  }
  if (driver.selection) {
    renderer.selection = () => driver.selection?.() ?? ''
  }
  if (driver.text) {
    renderer.text = (scope) => driver.text?.(scope) ?? ''
  }
  const search = driver.search
  if (search) {
    renderer.find = (query, how) => {
      if (theme) {
        search.find(query, how, theme.matches)
      }
    }
    renderer.findEnd = () => search.end()
  }

  const sink = frame.attach(renderer)

  stops.push(driver.onInput((data, binary) => sink.input(data, binary)))
  if (driver.onBell) {
    stops.push(driver.onBell(() => sink.bell()))
  }
  if (driver.onTitle) {
    stops.push(driver.onTitle((title) => sink.title(title)))
  }
  if (driver.onLink) {
    stops.push(driver.onLink((href) => sink.link(href)))
  }
  if (driver.onSelection) {
    stops.push(driver.onSelection(() => sink.selected((driver.selection?.() ?? '') !== '')))
  }
  if (search) {
    stops.push(search.onResults((index, count) => sink.found(index, count)))
  }
  const report = (grid: TerminalGrid): void => sink.resized({ ...grid, ...pixels() })
  if (driver.onResize) {
    stops.push(driver.onResize(report))
  }

  /* The theme, applied now and whenever the page's moves, and the grid
     refitted after it, since a new face or size changes what fits. Once a
     frame at most, and waiting out a stylesheet on its way back. */
  let pending = 0
  const restyle = (): void => {
    theme = terminalThemeNow(frame) ?? theme
    if (theme) {
      driver.theme?.(theme)
    }
    size()
  }
  const schedule = (): void => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      if (live) {
        restyle()
      }
    })
  }
  stops.push(watchTheme(frame, schedule))

  /* The reader's motion preference, heard as it changes. */
  const motion =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined
  motion?.addEventListener('change', applyOptions)
  stops.push(() => motion?.removeEventListener('change', applyOptions))

  /* The grid follows its element's size, once a frame at most, unless the
     frame fixed it. */
  const element = driver.element?.()
  if (element && typeof ResizeObserver === 'function') {
    let fitting = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(fitting)
      fitting = requestAnimationFrame(() => {
        if (live && !fixed()) {
          driver.fit?.()
        }
      })
    })
    observer.observe(element)
    stops.push(() => {
      cancelAnimationFrame(fitting)
      observer.disconnect()
    })
  }

  starting = false
  restyle()
  /* The size the page's process starts at, said once whether or not fitting
     changed it, since a renderer reports a change and this may be none. */
  const grid = driver.size?.()
  if (grid) {
    report(grid)
  }

  return {
    disconnect: () => {
      if (!live) {
        return
      }
      live = false
      cancelAnimationFrame(pending)
      for (const stop of stops.splice(0)) {
        stop()
      }
      sink.detach()
      driver.release?.()
    },
    fit: () => {
      if (live) {
        size()
      }
    },
  }
}
