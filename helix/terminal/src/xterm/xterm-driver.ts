import type {
  TerminalDriver,
  TerminalGrid,
  TerminalOptions,
} from '../connect-terminal/connect-terminal.js'
import type { TerminalTheme } from '../theme/terminal-theme.js'
import { linesOf } from './lines.js'

/** What xterm.js hands back from every listener, to stop it. */
interface Disposable {
  dispose(): void
}

/** An xterm.js addon, as `loadAddon` takes one. */
interface Addon extends Disposable {
  activate(terminal: never): void
}

/**
 * xterm.js's `Terminal`, as far as the driver calls it, so this package
 * depends on no version of it: the page brings its own. A spec holds this to
 * the real class.
 */
export interface XtermTerminal {
  readonly buffer: {
    readonly active: {
      getLine(
        y: number,
      ): { readonly isWrapped: boolean; translateToString(trimRight?: boolean): string } | undefined
      readonly length: number
      readonly viewportY: number
    }
  }
  clear(): void
  readonly cols: number
  readonly element: HTMLElement | undefined
  focus(): void
  getSelection(): string
  loadAddon(addon: never): void
  onBell(listener: () => void): Disposable
  onBinary(listener: (data: string) => void): Disposable
  onData(listener: (data: string) => void): Disposable
  onResize(listener: (size: { cols: number; rows: number }) => void): Disposable
  onSelectionChange(listener: () => void): Disposable
  onTitleChange(listener: (title: string) => void): Disposable
  options: {
    allowProposedApi?: boolean | undefined
    cursorBlink?: boolean | undefined
    disableStdin?: boolean | undefined
    fontFamily?: string | undefined
    fontSize?: number | undefined
    linkHandler?:
      | {
          activate(event: MouseEvent, text: string, range: never): void
          allowNonHttpProtocols?: boolean | undefined
        }
      | null
      | undefined
    minimumContrastRatio?: number | undefined
    screenReaderMode?: boolean | undefined
    smoothScrollDuration?: number | undefined
    theme?: object | undefined
  }
  paste(data: string): void
  reset(): void
  resize(columns: number, rows: number): void
  readonly rows: number
  readonly textarea: HTMLTextAreaElement | undefined
  write(data: string | Uint8Array, callback?: () => void): void
}

/** `@xterm/addon-fit`'s `FitAddon`, as far as the driver calls it. */
export interface XtermFit extends Addon {
  fit(): void
}

/** `@xterm/addon-search`'s `SearchAddon`, as far as the driver calls it. */
export interface XtermSearch extends Addon {
  clearDecorations(): void
  findNext(term: string, options?: XtermSearchOptions): boolean
  findPrevious(term: string, options?: XtermSearchOptions): boolean
  onDidChangeResults(
    listener: (results: { resultCount: number; resultIndex: number }) => void,
  ): Disposable
}

/** The search options the driver passes, which are what turn on the result count. */
interface XtermSearchOptions {
  decorations?: {
    activeMatchBackground?: string
    activeMatchBorder?: string
    activeMatchColorOverviewRuler: string
    matchBackground?: string
    matchOverviewRuler: string
  }
  incremental?: boolean
}

/** `@xterm/addon-web-links`'s `WebLinksAddon` class, which the driver makes with its own handler. */
export type XtermWebLinks = new (handler: (event: MouseEvent, uri: string) => void) => Addon

/**
 * The addons a driver can use, each one of the page's own, unloaded: the
 * driver loads them. Each turns on what it is named for.
 */
export interface XtermAddons {
  /** A `FitAddon`, which fits the grid to the frame. Without it the grid keeps the size it was made with. */
  fit?: XtermFit | undefined
  /** A `SearchAddon`, which the find bar searches with. Without it the frame draws no find control. */
  search?: XtermSearch | undefined
  /**
   * The `WebLinksAddon` class, which finds addresses in the text and makes
   * them links. Links a program writes as hyperlinks work without it.
   */
  webLinks?: XtermWebLinks | undefined
}

/** Stops a listener xterm.js gave back. */
const stopping =
  (disposable: Disposable): (() => void) =>
  () =>
    disposable.dispose()

/** The escape codes that show and hide the cursor, DECTCEM. */
const SHOW_CURSOR = '\u001b[?25h'
const HIDE_CURSOR = '\u001b[?25l'

/**
 * A driver for xterm.js 6. Open the terminal in the frame's element first,
 * then connect.
 *
 * The addons are optional and the page's own, so it brings the versions it
 * has. The driver loads them; pass each one new.
 */
export const xtermDriver = (terminal: XtermTerminal, addons: XtermAddons = {}): TerminalDriver => {
  /* What the driver changes, as the page made it, to put back on release. */
  const made = {
    allowProposedApi: terminal.options.allowProposedApi ?? false,
    cursorBlink: terminal.options.cursorBlink ?? false,
    disableStdin: terminal.options.disableStdin ?? false,
    linkHandler: terminal.options.linkHandler ?? null,
    minimumContrastRatio: terminal.options.minimumContrastRatio ?? 1,
    screenReaderMode: terminal.options.screenReaderMode ?? false,
    smoothScrollDuration: terminal.options.smoothScrollDuration ?? 0,
  }
  let cursorShown = true
  const { fit, search, webLinks } = addons
  if (fit) {
    terminal.loadAddon(fit as never)
  }
  if (search) {
    /* The search addon's highlights are what count the matches, and xterm.js
       counts them among its proposed API, which refuses every call until it is
       allowed. Put back on release. */
    terminal.options.allowProposedApi = true
    terminal.loadAddon(search as never)
  }

  const driver: TerminalDriver = {
    clear: () => terminal.clear(),
    element: () => terminal.element?.parentElement ?? null,
    focus: () => terminal.focus(),
    input: () => terminal.textarea ?? null,
    onBell: (rang) => stopping(terminal.onBell(() => rang())),
    onInput: (input) => {
      const typed = terminal.onData((data) => input(data, false))
      const bytes = terminal.onBinary((data) => input(data, true))
      return () => {
        typed.dispose()
        bytes.dispose()
      }
    },
    onLink: (activated) => {
      /* Every scheme reaches the frame, which opens only web addresses itself
         and leaves the rest to a page that takes them. */
      terminal.options.linkHandler = {
        activate: (_event, text) => activated(text),
        allowNonHttpProtocols: true,
      }
      const found = webLinks ? new webLinks((_event, uri) => activated(uri)) : undefined
      if (found) {
        terminal.loadAddon(found as never)
      }
      return () => {
        terminal.options.linkHandler = made.linkHandler
        found?.dispose()
      }
    },
    onResize: (resized) =>
      stopping(terminal.onResize(({ cols, rows }) => resized({ columns: cols, rows }))),
    onSelection: (changed) => stopping(terminal.onSelectionChange(() => changed())),
    onTitle: (changed) => stopping(terminal.onTitleChange((title) => changed(title))),
    options: (options: TerminalOptions) => {
      terminal.options.disableStdin = !options.input
      terminal.options.minimumContrastRatio = options.contrast
      terminal.options.screenReaderMode = options.screenReader
      terminal.options.cursorBlink = options.motion && made.cursorBlink
      terminal.options.smoothScrollDuration = options.motion ? made.smoothScrollDuration : 0
      if (options.cursor !== cursorShown) {
        cursorShown = options.cursor
        terminal.write(cursorShown ? SHOW_CURSOR : HIDE_CURSOR)
      }
    },
    paste: (text) => terminal.paste(text),
    pixels: () => {
      /* The grid's own box, which xterm.js sizes to its cells exactly, where
         the element around it keeps what is left over. */
      const box = terminal.element?.querySelector('.xterm-screen')?.getBoundingClientRect()
      return box && box.width > 0
        ? { height: Math.round(box.height), width: Math.round(box.width) }
        : undefined
    },
    release: () => {
      terminal.options.allowProposedApi = made.allowProposedApi
      terminal.options.cursorBlink = made.cursorBlink
      terminal.options.disableStdin = made.disableStdin
      terminal.options.minimumContrastRatio = made.minimumContrastRatio
      terminal.options.screenReaderMode = made.screenReaderMode
      terminal.options.smoothScrollDuration = made.smoothScrollDuration
      if (!cursorShown) {
        cursorShown = true
        terminal.write(SHOW_CURSOR)
      }
    },
    reset: () => terminal.reset(),
    resize: (columns, rows) => terminal.resize(columns, rows),
    selection: () => terminal.getSelection(),
    size: (): TerminalGrid => ({ columns: terminal.cols, rows: terminal.rows }),
    text: (scope) => {
      const buffer = terminal.buffer.active
      const from = scope === 'all' ? 0 : buffer.viewportY
      const to = scope === 'all' ? buffer.length : buffer.viewportY + terminal.rows
      const lines = []
      for (let y = from; y < to; y++) {
        const line = buffer.getLine(y)
        if (line) {
          lines.push({ text: line.translateToString(true), wrapped: line.isWrapped })
        }
      }
      return linesOf(lines)
    },
    theme: (theme: TerminalTheme) => {
      terminal.options.theme = { ...theme.colors }
      if (theme.font) {
        terminal.options.fontFamily = theme.font.family
        terminal.options.fontSize = theme.font.size
      }
    },
    write: (data, done) => terminal.write(data, done),
  }
  if (fit) {
    driver.fit = () => {
      /* A terminal that is not open, or is in a box with no size, has no
         cells to fit: the addon would measure nothing and shrink it to one. */
      const box = terminal.element?.parentElement?.getBoundingClientRect()
      if (box && box.width > 0 && box.height > 0) {
        fit.fit()
      }
    }
  }
  if (search) {
    driver.search = {
      end: () => search.clearDecorations(),
      find: (query, { backward, incremental }, matches) => {
        const options: XtermSearchOptions = {
          decorations: {
            activeMatchBorder: matches.activeBorder,
            activeMatchColorOverviewRuler: matches.ruler,
            matchOverviewRuler: matches.ruler,
            ...(matches.activeBackground
              ? { activeMatchBackground: matches.activeBackground }
              : {}),
            ...(matches.background ? { matchBackground: matches.background } : {}),
          },
          incremental,
        }
        if (backward) {
          search.findPrevious(query, options)
        } else {
          search.findNext(query, options)
        }
      },
      onResults: (found) =>
        stopping(
          search.onDidChangeResults(({ resultCount, resultIndex }) =>
            found(resultIndex, resultCount),
          ),
        ),
    }
  }
  return driver
}

/**
 * The terminal options a theme sets, for creating the terminal already in it:
 * `new Terminal(xtermOptions(await terminalThemeReady(frame)))`.
 */
export const xtermOptions = (
  theme: TerminalTheme,
): { fontFamily?: string; fontSize?: number; theme: TerminalTheme['colors'] } => ({
  ...(theme.font ? { fontFamily: theme.font.family, fontSize: theme.font.size } : {}),
  theme: { ...theme.colors },
})
