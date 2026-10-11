import {
  CopyController,
  customElement,
  drawIcon,
  FullscreenController,
  formatWords,
  HelixElement,
  HelixTerminalBellEvent,
  HelixTerminalInputEvent,
  HelixTerminalLinkEvent,
  HelixTerminalResizeEvent,
  HelixTerminalRestartEvent,
  HelixTerminalTitleEvent,
  numberConverter,
  onApple,
  type TerminalResizeDetail,
  words,
} from '@fusion.dev/helix-core'
import {
  arrowClockwise,
  broom,
  caretDown,
  caretUp,
  copy,
  cornersOut,
  magnifyingGlass,
  x,
} from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { live } from 'lit/directives/live.js'
import { isTab, shortcutOf, spokenChord, type TerminalShortcut } from '../keys.js'

/** How a search through a terminal's output moves. */
export interface TerminalFindOptions {
  /** Toward the top of the output, for the previous match. */
  backward: boolean
  /** Whether the search is the reader still typing, which stays on the match it has where it still matches. */
  incremental: boolean
}

/** What the frame asks of whatever draws the terminal, as the frame's settings stand. */
export interface TerminalSettings {
  /** The grid's width in cells, or `undefined` for as many as fit the frame. */
  columns: number | undefined
  /** Whether the cursor is drawn, which it is not while `readonly`. */
  cursor: boolean
  /** Whether the reader's keys reach the program: not while `readonly`, and not once its process has exited. */
  input: boolean
  /** The grid's height in lines, or `undefined` for as many as fit the frame. */
  rows: number | undefined
  /** Whether the renderer keeps an accessible copy of the grid and says new output. */
  screenReader: boolean
}

/**
 * What draws a terminal for the frame: `connectTerminal` from
 * `@fusion.dev/helix-terminal` builds one from a driver, and a page drawing its
 * own terminal hands the frame its own.
 *
 * `write` is the one method it must have. Each other one turns on what it is
 * named for, and the frame leaves out the control a renderer cannot answer.
 */
export interface TerminalRenderer {
  /** Clears the scrollback, keeping the line the cursor is on. */
  clear?(): void
  /** Searches the output for `query` and highlights the matches, reporting them through `found`. */
  find?(query: string, options: TerminalFindOptions): void
  /** Takes the highlights off once the find bar closes. */
  findEnd?(): void
  /** Focuses the renderer's input. */
  focus?(): void
  /** The element that takes the reader's keys, which the frame names. */
  input?(): HTMLElement | null | undefined
  /** Inputs text as a paste does, in bracketed paste mode where the program asked for it. */
  paste?(text: string): void
  /** Resets the emulator: its modes, its colors, and its screen. */
  reset?(): void
  /** The text selected in the grid, or an empty string. */
  selection?(): string
  /** Applies the frame's settings. Called when attached and whenever one changes. */
  settings?(settings: TerminalSettings): void
  /** The grid as plain text: the lines on screen, or every line the scrollback holds. */
  text?(scope: 'all' | 'screen'): string
  /** Writes the program's output, and calls `done` once it has been parsed. */
  write(data: string | Uint8Array, done: () => void): void
}

/**
 * The eight ANSI colors, in the order SGR numbers them. Each has a bright form
 * as well, which the frame reads from a property of its own.
 */
const ANSI = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const

/** A color the frame reads, by the name a renderer's theme gives it. */
export type TerminalColorName =
  | 'activeMatch'
  | 'activeMatchBorder'
  | 'background'
  | 'black'
  | 'blue'
  | 'brightBlack'
  | 'brightBlue'
  | 'brightCyan'
  | 'brightGreen'
  | 'brightMagenta'
  | 'brightRed'
  | 'brightWhite'
  | 'brightYellow'
  | 'cursor'
  | 'cyan'
  | 'foreground'
  | 'green'
  | 'magenta'
  | 'match'
  | 'red'
  | 'scrollbar'
  | 'selection'
  | 'white'
  | 'yellow'

/**
 * The colors and the face the terminal is to be drawn in, as the `--terminal-*`
 * properties where the frame is resolve them: each color as the browser
 * computed it, and none for a property nothing set.
 */
export interface TerminalLook {
  colors: Partial<Record<TerminalColorName, string>>
  /** The viewport's face, which the grid's cells are measured in. */
  font: { family: string; size: number } | undefined
}

/** `bright-black` as a theme names it, `brightBlack`. */
const camel = (name: string): string =>
  name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

/** Whether a computed color is the probe's own transparent ground, which is what an unset property leaves. */
const unset = (color: string): boolean =>
  color === '' || color === 'transparent' || /^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(color)

/** What the frame gives back to whatever it is attached to: how a renderer tells the frame what happened. */
export interface TerminalSink {
  /** The program rang the bell. */
  bell(): void
  /** Detaches the renderer, which the frame stops writing to and asking. */
  detach(): void
  /** A search found `count` matches, the one at `index` current, counting from `0`, or `-1` for none. */
  found(index: number, count: number): void
  /** The reader typed or pasted `data`, encoded for the program. */
  input(data: string, binary?: boolean): void
  /** A link in the output was activated. */
  link(href: string): void
  /** The grid changed size. */
  resized(size: TerminalResizeDetail): void
  /** Whether any text is selected now, which the copy control follows. */
  selected(any: boolean): void
  /** The program set its title. */
  title(title: string): void
}

/** How long the bell's flash holds, in milliseconds: one beat, long enough to see. */
const BELL = 200

/** The controls the frame draws where `controls` is absent. */
const RESTING_CONTROLS = 'find clear'

/** Whether an address is one the frame opens itself: a web page, and nothing a program could run. */
const opens = (href: string): boolean => /^https?:\/\//i.test(href)

/**
 * @summary A frame around a terminal emulator that runs a shell you connect.
 *
 * @description
 * Wraps a terminal drawn by xterm.js or another emulator. The frame adds a
 * header with the terminal's name and its controls, a find bar, and a status
 * line. `connectTerminal` in `@fusion.dev/helix-terminal` connects it to the
 * emulator and draws the terminal in the colors the `--terminal-*` properties
 * set, which the styled tier sets from your theme. Helix does not start a
 * process: you connect the stream. Write the program's output with `write()`, send what the
 * reader types to the process from `helix-terminal-input`, and resize the
 * process's pseudo-terminal from `helix-terminal-resize`.
 *
 * Output written before a renderer is connected is held and written first, so
 * the process can start before the emulator loads. `write()` resolves once
 * the renderer has parsed the output, which is how a page pauses a process
 * that writes faster than the terminal draws.
 *
 * The controls are a row in the header, and `controls` names which ones:
 * `find`, `copy`, `clear`, and `fullscreen`. `find clear` by default. A control
 * the renderer cannot answer is left out once it is connected. Set `exit-code`
 * when the process exits: the frame says how it exited, stops sending input,
 * and shows a Restart button that sends `helix-terminal-restart`.
 *
 * **Keyboard.** Every key goes to the program, Tab, Shift+Tab, and Escape
 * included, except these:
 *
 * - Control+Shift+F, or Command+F on a Mac, opens the find bar. Enter and
 *   Shift+Enter move between the matches, and Escape closes the bar and
 *   returns focus to the terminal.
 * - Control+Shift+C copies the selection. On a Mac, Command+C does.
 * - Control+M, or Control+Shift+M on a Mac, switches Tab between typing in the
 *   terminal and moving focus out of it. The status line says when Tab moves
 *   focus, and the terminal's input describes the key to a screen reader.
 *
 * **Screen readers.** A terminal draws its grid as a picture of text, so a
 * screen reader reads nothing in it by default. Set `screen-reader-mode` to
 * have the renderer keep the grid as lines a screen reader can move through
 * and announce new output as it arrives, which xterm.js calls screen reader
 * mode. It costs time on every write, so it is off by default: connect it to
 * a setting your reader can turn on.
 *
 * @since 0.209.0
 * @status experimental
 * @category media
 * @aliases Terminal emulator, Shell, xterm
 * @documentation https://fusion.dev/helix/components/terminal
 *
 * @slot - The element your renderer draws the terminal in.
 * @slot actions - Controls of your own in the header, before the built-in ones, such as a button that splits the pane.
 * @slot clear-icon - Replaces the glyph inside the clear button.
 * @slot copy-icon - Replaces the glyph inside the copy button.
 * @slot exit-actions - Controls of your own beside Restart, shown once the process exits, such as a button that opens the whole log.
 * @slot find-actions - Controls of your own in the find bar, between the count and the buttons that move between matches.
 * @slot find-close-icon - Replaces the glyph inside the button that closes the find bar.
 * @slot find-icon - Replaces the glyph inside the find button.
 * @slot find-next-icon - Replaces the glyph inside the next match button.
 * @slot find-previous-icon - Replaces the glyph inside the previous match button.
 * @slot fullscreen-icon - Replaces the glyph inside the fullscreen button.
 * @slot label - The terminal's name in the header, such as an icon beside the shell's name. Replaces `label` there.
 * @slot restart-icon - Replaces the glyph inside the Restart button.
 *
 * @event {HelixCopyEvent} helix-copy - The copy control or its key put the selection on the clipboard.
 * @event {HelixTerminalBellEvent} helix-terminal-bell - The program rang the bell. The frame flashes once.
 * @event {HelixTerminalInputEvent} helix-terminal-input - The reader typed or pasted, with `data` encoded for the program. Write it to the process. Not sent while `readonly`, or once `exit-code` is set.
 * @event {HelixTerminalLinkEvent} helix-terminal-link - A link in the output was activated, with its `href`. Cancelable: cancel it to open the link yourself. Left alone, a web address opens in a new tab.
 * @event {HelixTerminalResizeEvent} helix-terminal-resize - The grid changed size, with `columns`, `rows`, `width`, and `height`. Resize the process's pseudo-terminal to match.
 * @event {HelixTerminalRestartEvent} helix-terminal-restart - The Restart button was pressed after the process exited. Start a new process and clear `exit-code`.
 * @event {HelixTerminalTitleEvent} helix-terminal-title - The program set its title, with `title`. The frame keeps its own `label`.
 *
 * @csspart actions - The box in the header that holds the `actions` slot.
 * @csspart clear - The button that clears the scrollback.
 * @csspart controls - The row of built-in buttons at the end of the header.
 * @csspart copy - The button that copies the selection. Disabled while nothing is selected.
 * @csspart exit-actions - The box in the status line that holds the `exit-actions` slot.
 * @csspart find - The button that opens and closes the find bar. Pressed while it is open.
 * @csspart find-actions - The box in the find bar that holds the `find-actions` slot.
 * @csspart find-bar - The bar under the header where the reader searches the output.
 * @csspart find-close - The button that closes the find bar.
 * @csspart find-count - Which match is current and how many there are, such as "3 of 12 matches".
 * @csspart find-field - The search field in the find bar.
 * @csspart find-next - The button that moves to the next match.
 * @csspart find-previous - The button that moves to the previous match.
 * @csspart fullscreen - The button that makes the terminal fill the screen.
 * @csspart header - The strip above the terminal, with its name, your actions, and the controls.
 * @csspart label - The terminal's name in the header.
 * @csspart live - What screen readers hear after the frame acts: a match count, a copy, or a change to what Tab does. Visually hidden in the styled tier.
 * @csspart region - The named group the terminal sits in.
 * @csspart restart - The button in the status line that asks for a new process after the last one exited.
 * @csspart status - The line under the terminal that says the process exited, or that Tab moves focus.
 * @csspart viewport - The box the terminal is drawn in.
 *
 * @cssproperty --terminal-active-match-background-color - The ground of the current match of a search.
 * @cssproperty --terminal-active-match-border-color - The edge of the current match of a search.
 * @cssproperty --terminal-ansi-black - ANSI black, which codes `30` and `40` draw.
 * @cssproperty --terminal-ansi-blue - ANSI blue, which codes `34` and `44` draw.
 * @cssproperty --terminal-ansi-bright-black - ANSI bright black, which codes `90` and `100` draw.
 * @cssproperty --terminal-ansi-bright-blue - ANSI bright blue, which codes `94` and `104` draw.
 * @cssproperty --terminal-ansi-bright-cyan - ANSI bright cyan, which codes `96` and `106` draw.
 * @cssproperty --terminal-ansi-bright-green - ANSI bright green, which codes `92` and `102` draw.
 * @cssproperty --terminal-ansi-bright-magenta - ANSI bright magenta, which codes `95` and `105` draw.
 * @cssproperty --terminal-ansi-bright-red - ANSI bright red, which codes `91` and `101` draw.
 * @cssproperty --terminal-ansi-bright-white - ANSI bright white, which codes `97` and `107` draw.
 * @cssproperty --terminal-ansi-bright-yellow - ANSI bright yellow, which codes `93` and `103` draw.
 * @cssproperty --terminal-ansi-cyan - ANSI cyan, which codes `36` and `46` draw.
 * @cssproperty --terminal-ansi-green - ANSI green, which codes `32` and `42` draw.
 * @cssproperty --terminal-ansi-magenta - ANSI magenta, which codes `35` and `45` draw.
 * @cssproperty --terminal-ansi-red - ANSI red, which codes `31` and `41` draw.
 * @cssproperty --terminal-ansi-white - ANSI white, which codes `37` and `47` draw.
 * @cssproperty --terminal-ansi-yellow - ANSI yellow, which codes `33` and `43` draw.
 * @cssproperty --terminal-background-color - The ground of the grid.
 * @cssproperty --terminal-color - The text of the grid where the program sets no color.
 * @cssproperty --terminal-cursor-color - The cursor.
 * @cssproperty --terminal-match-background-color - The ground of every match of a search but the current one.
 * @cssproperty --terminal-scrollbar-thumb-color - The grid's scrollbar.
 * @cssproperty --terminal-selection-background-color - The ground of selected text. See-through, so the text keeps its color.
 *
 * @cssstate bell - The program rang the bell, held for a moment for a visual bell.
 * @cssstate exited - The process has exited, by `exit-code`.
 * @cssstate find-open - The find bar is open.
 * @cssstate fullscreen - The terminal fills the screen.
 * @cssstate tab-moves-focus - Tab moves focus out of the terminal, after Control+M.
 */
@customElement('helix-headless-terminal')
export class HelixHeadlessTerminal extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-terminal': { findLabel: 'Suchen' } })`.
   */
  static words = 'helix-terminal'

  /** The clear button's label. */
  @words
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /** The grid's width in character cells. Set it with `rows` to fix the grid's size; unset, the grid fills the frame. */
  @property({ converter: numberConverter('columns', undefined) })
  columns?: number | undefined

  /**
   * Which built-in controls the header shows, as a list of `find`, `copy`,
   * `clear`, and `fullscreen`, or `none`. Absent is `find clear`.
   */
  @property({ reflect: true })
  controls?: string

  /** The name of the row of controls, read by screen readers. */
  @words
  @property({ attribute: 'controls-label' })
  controlsLabel = 'Terminal controls'

  /** What screen readers hear after a copy. */
  @words
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /** The copy button's label. */
  @words
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy'

  /**
   * How the process exited, which the page sets when it does. While it is set,
   * the status line says it, the frame sends no input, and Restart is shown.
   * Clear it when a new process starts.
   */
  @property({ attribute: 'exit-code', converter: numberConverter('exit-code', undefined) })
  exitCode?: number | undefined

  /**
   * What the status line says once the process has exited. `{code}` is its
   * exit code, written as the process gave it, and code `0` is a clean exit.
   */
  @words
  @property({ attribute: 'exited-label' })
  exitedLabel =
    '{code, select, 0 {The process exited.} other {The process exited with code {code}.}}'

  /** The terminal's name where `label` is empty and the host has no `aria-label`. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Terminal'

  /** The label of the button that closes the find bar. */
  @words
  @property({ attribute: 'find-close-label' })
  findCloseLabel = 'Close find'

  /** The find button's label, and the find field's name and placeholder. */
  @words
  @property({ attribute: 'find-label' })
  findLabel = 'Find'

  /** The next match button's label. */
  @words
  @property({ attribute: 'find-next-label' })
  findNextLabel = 'Next match'

  /** The previous match button's label. */
  @words
  @property({ attribute: 'find-previous-label' })
  findPreviousLabel = 'Previous match'

  /** The fullscreen button's label. */
  @words
  @property({ attribute: 'fullscreen-label' })
  fullscreenLabel = 'Fill the screen'

  /** The name of the element the reader types into, which the renderer draws. */
  @words
  @property({ attribute: 'input-label' })
  inputLabel = 'Terminal input'

  /**
   * The terminal's name, in the header and for screen readers, such as the
   * shell or the folder it runs in. Several terminals on a page need names
   * that tell them apart.
   */
  @property()
  label = ''

  /**
   * What the find bar says of its matches. `{index}` is the current match,
   * counting from 1, and `{count}` how many there are.
   */
  @words
  @property({ attribute: 'matches-label' })
  matchesLabel =
    '{count, plural, =0 {No matches} one {{index} of # match} other {{index} of # matches}}'

  /**
   * Draws the output and sends no input, with no cursor, for a transcript or
   * a command an agent ran. The attribute is `readonly`, the platform's
   * spelling.
   */
  @property({ attribute: 'readonly', type: Boolean })
  readOnly = false

  /** The Restart button's label. */
  @words
  @property({ attribute: 'restart-label' })
  restartLabel = 'Restart'

  /** The grid's height in lines. Set it with `columns` to fix the grid's size; unset, the grid fills the frame. */
  @property({ converter: numberConverter('rows', undefined) })
  rows?: number | undefined

  /**
   * Keeps the grid as lines a screen reader moves through, and says new
   * output as it arrives. Off by default, since it costs time on every
   * write. Connect it to a setting your reader can turn on.
   */
  @property({ attribute: 'screen-reader-mode', type: Boolean })
  screenReaderMode = false

  /** What the terminal's input describes to a screen reader. `{key}` is the key that switches Tab. */
  @words
  @property({ attribute: 'tab-hint-label' })
  tabHintLabel = 'Press {key} to move focus with Tab.'

  /** What the status line says while Tab moves focus. `{key}` is the key that switches it back. */
  @words
  @property({ attribute: 'tab-moves-focus-label' })
  tabMovesFocusLabel = 'Tab moves focus. Press {key} to type Tab in the terminal.'

  /** What screen readers hear when Tab goes back to typing in the terminal. */
  @words
  @property({ attribute: 'tab-types-label' })
  tabTypesLabel = 'Tab types in the terminal.'

  /** Whether the find bar is open. */
  @state()
  private findOpen = false

  /** What the find field holds. */
  @state()
  private query = ''

  /** The current match, counting from `0`, or `-1` for none. */
  @state()
  private matchIndex = -1

  /** How many matches the search found, or `undefined` before one ran. */
  @state()
  private matchCount: number | undefined = undefined

  /** Whether Tab moves focus, after Control+M. */
  @state()
  private tabMovesFocus = false

  /** Whether any text is selected in the grid. */
  @state()
  private anySelected = false

  /** Whether the page slotted controls of its own into the header. */
  @state()
  private hasActions = false

  /** Whether the page slotted a name of its own into the header. */
  @state()
  private hasLabel = false

  /** What the live region says now, and how many times something has been said. */
  @state()
  private announcement = ''

  @state()
  private said = 0

  /** What draws the terminal, while one is attached. */
  @state()
  private renderer: TerminalRenderer | undefined = undefined

  /** Output written before a renderer was attached, in order. */
  private pending: { data: string | Uint8Array; done: () => void }[] = []

  /** The attributes the frame wrote on the renderer's input, as they were before, to put back. */
  private inputWas: { element: HTMLElement; values: Record<string, string | null> } | undefined =
    undefined

  /** The wait before the bell's flash ends. */
  private ringing: ReturnType<typeof setTimeout> | undefined = undefined

  private readonly copier = new CopyController(this)

  /** Whether the terminal fills the screen. */
  @state()
  private filled = false

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.filled = full
    this.toggleState('fullscreen', full)
  })

  /**
   * Writes the program's output. Resolves once the renderer has parsed it,
   * which is how a page pauses a process that writes faster than the
   * terminal draws. Output written before a renderer is attached is held and
   * written first.
   */
  write(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      if (this.renderer) {
        this.renderer.write(data, resolve)
      } else {
        this.pending.push({ data, done: resolve })
      }
    })
  }

  /**
   * Inputs text as a paste does, in bracketed paste mode where the program
   * asked for it. It arrives as `helix-terminal-input`, like typed text.
   */
  paste(text: string): void {
    if (this.renderer?.paste) {
      this.renderer.paste(text)
    } else {
      this.send(text, false)
    }
  }

  /** Clears the scrollback, keeping the line the cursor is on. */
  clear(): void {
    this.renderer?.clear?.()
  }

  /** Resets the emulator: its modes, its colors, and its screen. */
  reset(): void {
    this.renderer?.reset?.()
  }

  /**
   * The terminal as plain text, as the renderer drew it: the lines on screen,
   * or with `all`, every line the scrollback holds. Empty before a renderer is
   * attached.
   */
  text(scope: 'all' | 'screen' = 'screen'): string {
    return this.renderer?.text?.(scope) ?? ''
  }

  /**
   * The colors and the face the terminal is to be drawn in, as the
   * `--terminal-*` properties resolve where the frame is. `connectTerminal`
   * themes the renderer from it. A color nothing sets is left out, so the
   * renderer keeps its own: the headless tier sets none, and the styled tier
   * sets every one from the theme.
   */
  look(): TerminalLook {
    const colors: TerminalLook['colors'] = {}
    for (const probe of this.renderRoot.querySelectorAll<HTMLElement>(
      '[data-look] > [data-color]',
    )) {
      const color = getComputedStyle(probe).color
      if (!unset(color)) {
        colors[camel(probe.dataset.color ?? '') as TerminalColorName] = color
      }
    }
    const viewport = this.partNamed('viewport')
    const face = viewport ? getComputedStyle(viewport) : undefined
    const size = face ? Number.parseFloat(face.fontSize) : Number.NaN
    return {
      colors,
      font: face && Number.isFinite(size) ? { family: face.fontFamily, size } : undefined,
    }
  }

  /** Focuses the terminal's input, where a renderer is attached. */
  override focus(options?: FocusOptions): void {
    if (this.renderer?.focus) {
      this.renderer.focus()
      return
    }
    const input = this.renderer?.input?.()
    if (input) {
      input.focus(options)
      return
    }
    super.focus(options)
  }

  /**
   * Attaches what draws the terminal, and returns how it tells the frame what
   * happened. `connectTerminal` calls it; a page drawing its own terminal calls
   * it with its own renderer. Attaching another detaches the first.
   */
  attach(renderer: TerminalRenderer): TerminalSink {
    this.release()
    this.renderer = renderer
    for (const { data, done } of this.pending.splice(0)) {
      renderer.write(data, done)
    }
    renderer.settings?.(this.settings)
    this.nameInput()
    const current = (): boolean => this.renderer === renderer
    return {
      bell: () => {
        if (current()) {
          this.ring()
        }
      },
      detach: () => {
        if (current()) {
          this.release()
          this.renderer = undefined
        }
      },
      found: (index, count) => {
        if (current()) {
          this.matchIndex = index
          this.matchCount = count
          this.say(this.countText)
        }
      },
      input: (data, binary = false) => {
        if (current()) {
          this.send(data, binary)
        }
      },
      link: (href) => {
        if (current()) {
          this.follow(href)
        }
      },
      resized: (size) => {
        if (current()) {
          this.dispatchEvent(new HelixTerminalResizeEvent(size))
        }
      },
      selected: (any) => {
        if (current()) {
          this.anySelected = any
        }
      },
      title: (title) => {
        if (current()) {
          this.dispatchEvent(new HelixTerminalTitleEvent({ title }))
        }
      },
    }
  }

  /** The settings a renderer applies, as the frame's properties stand. */
  private get settings(): TerminalSettings {
    const fixed = this.columns !== undefined && this.rows !== undefined
    return {
      columns: fixed ? this.columns : undefined,
      cursor: !this.readOnly,
      input: !this.readOnly && this.exitCode === undefined,
      rows: fixed ? this.rows : undefined,
      screenReader: this.screenReaderMode,
    }
  }

  /** Sends input to the page, unless input is closed. */
  private send(data: string, binary: boolean): void {
    if (this.readOnly || this.exitCode !== undefined || data === '') {
      return
    }
    this.dispatchEvent(new HelixTerminalInputEvent({ binary, data }))
  }

  /** Offers a link to the page, and opens a web address where the page did not take it. */
  private follow(href: string): void {
    const event = new HelixTerminalLinkEvent({ href })
    this.dispatchEvent(event)
    if (!event.defaultPrevented && opens(href)) {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  /** Flashes for the bell, and says so to the page. */
  private ring(): void {
    clearTimeout(this.ringing)
    this.toggleState('bell', true)
    this.ringing = setTimeout(() => this.toggleState('bell', false), BELL)
    this.dispatchEvent(new HelixTerminalBellEvent())
  }

  /** Says something in the live region, once, even where it is what was said last. */
  private say(text: string): void {
    this.announcement = text
    this.said += 1
  }

  /** Whether `controls`, or the resting controls, names a control the renderer can answer. */
  private draws(control: 'clear' | 'copy' | 'find' | 'fullscreen'): boolean {
    if (!(this.controls ?? RESTING_CONTROLS).split(/\s+/).includes(control)) {
      return false
    }
    /* Drawn by the list alone until a renderer is attached, so a server's
       header has the buttons a connected one will, and only narrowed once
       the renderer says what it can do. */
    const renderer = this.renderer
    if (!renderer || control === 'fullscreen') {
      return true
    }
    return control === 'clear'
      ? renderer.clear !== undefined
      : control === 'copy'
        ? renderer.selection !== undefined
        : renderer.find !== undefined
  }

  /** The find bar's count, as the reader reads it. */
  private get countText(): string {
    return this.matchCount === undefined
      ? ''
      : formatWords(this, 'matchesLabel', {
          count: this.matchCount,
          index: Math.max(this.matchIndex, 0) + 1,
        })
  }

  /** The chord that switches Tab, as a reader says it. */
  private get tabKey(): string {
    return spokenChord('tab-focus', onApple())
  }

  /**
   * Names the renderer's input for a screen reader: what it is, how Tab
   * leaves it, and which keys the frame takes. What was there is kept, and put
   * back on detach.
   */
  private nameInput(): void {
    const element = this.renderer?.input?.()
    if (!element) {
      return
    }
    if (this.inputWas?.element !== element) {
      this.restoreInput()
      this.inputWas = {
        element,
        values: Object.fromEntries(
          ['aria-description', 'aria-keyshortcuts', 'aria-label'].map((name) => [
            name,
            element.getAttribute(name),
          ]),
        ),
      }
    }
    const apple = onApple()
    const keys = (['find', 'copy', 'tab-focus'] as const)
      .filter((shortcut) => this.takes(shortcut))
      .map((shortcut) => spokenChord(shortcut, apple))
      .filter((chord) => chord !== '')
    element.setAttribute('aria-label', this.inputLabel)
    element.setAttribute(
      'aria-description',
      formatWords(this, 'tabHintLabel', { key: this.tabKey }),
    )
    element.setAttribute('aria-keyshortcuts', keys.join(' '))
  }

  /** Puts the renderer's input back as it was before the frame named it. */
  private restoreInput(): void {
    const was = this.inputWas
    if (!was) {
      return
    }
    for (const [name, value] of Object.entries(was.values)) {
      if (value === null) {
        was.element.removeAttribute(name)
      } else {
        was.element.setAttribute(name, value)
      }
    }
    this.inputWas = undefined
  }

  /** Lets go of the renderer that is attached: its input put back, and the find bar closed. */
  private release(): void {
    this.restoreInput()
    this.findOpen = false
    this.matchCount = undefined
    this.anySelected = false
  }

  /** Whether the frame answers a shortcut with the renderer it has. */
  private takes(shortcut: TerminalShortcut): boolean {
    const renderer = this.renderer
    if (!renderer) {
      return false
    }
    if (shortcut === 'find') {
      return renderer.find !== undefined
    }
    if (shortcut === 'copy') {
      return renderer.selection !== undefined
    }
    return true
  }

  /**
   * The frame's keys, heard before the renderer's: in the capture phase, on
   * the host, which is an ancestor of the renderer's element in the page, so
   * a key the frame takes never reaches the program.
   */
  private readonly handleKeys = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) {
      return
    }
    const origin = event.composedPath()[0]
    /* A key pressed in the find bar is the bar's, except the find key,
       which puts focus back in the field. */
    const inGrid = !(origin instanceof Node && this.renderRoot.contains(origin))
    const shortcut = shortcutOf(event, onApple())
    if (shortcut === 'find' && this.takes('find')) {
      event.preventDefault()
      event.stopPropagation()
      void this.openFind()
      return
    }
    if (!inGrid || !this.renderer) {
      return
    }
    if (shortcut === 'copy' && this.takes('copy')) {
      /* Taken whether or not anything is selected: let through, Control
         and Shift with C reaches the program as Control+C and interrupts
         it, which a reader reaching to copy did not ask for. */
      event.preventDefault()
      event.stopPropagation()
      void this.copySelection()
      return
    }
    if (shortcut === 'tab-focus') {
      event.preventDefault()
      event.stopPropagation()
      this.tabMovesFocus = !this.tabMovesFocus
      this.say(
        this.tabMovesFocus
          ? formatWords(this, 'tabMovesFocusLabel', { key: this.tabKey })
          : this.tabTypesLabel,
      )
      return
    }
    if (this.tabMovesFocus && isTab(event)) {
      /* Kept from the renderer and left to the browser, which moves focus. */
      event.stopPropagation()
    }
  }

  /** Opens the find bar and puts focus in its field, searching again for what it holds. */
  private async openFind(): Promise<void> {
    this.findOpen = true
    await this.updateComplete
    const field = this.partNamed<HTMLInputElement>('find-field')
    field?.focus()
    field?.select()
    if (this.query !== '') {
      this.search(false, true)
    }
  }

  /** Closes the find bar, takes its highlights off, and returns focus to the terminal. */
  private closeFind(): void {
    this.findOpen = false
    this.matchCount = undefined
    this.matchIndex = -1
    this.renderer?.findEnd?.()
    this.focus()
  }

  /** Searches for what the field holds, toward the bottom or with `backward` toward the top. */
  private search(backward: boolean, incremental = false): void {
    if (this.query === '') {
      this.matchCount = undefined
      this.renderer?.findEnd?.()
      return
    }
    this.renderer?.find?.(this.query, { backward, incremental })
  }

  private readonly handleFindInput = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value
    this.search(false, true)
  }

  private readonly handleFindKeys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.closeFind()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.search(event.shiftKey)
    }
  }

  /** Copies the selection, and says so. */
  private async copySelection(): Promise<void> {
    const text = this.renderer?.selection?.() ?? ''
    if (text !== '' && (await this.copier.copy(text))) {
      this.say(this.copiedLabel)
    }
  }

  private readonly handleActions = (event: Event): void => {
    this.hasActions = (event.target as HTMLSlotElement).assignedNodes().length > 0
  }

  private readonly handleLabel = (event: Event): void => {
    this.hasLabel = (event.target as HTMLSlotElement).assignedNodes().length > 0
  }

  private readonly handleRestart = (): void => {
    this.dispatchEvent(new HelixTerminalRestartEvent())
  }

  /**
   * Says the process exited, where it exited after the first render: an exit
   * written in the markup is shown and not news. Here and not in `updated`, so
   * the words go out in the update the exit caused rather than in another one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    if (this.hasUpdated && changed.has('exitCode') && this.exitCode !== undefined) {
      this.say(formatWords(this, 'exitedLabel', { code: String(this.exitCode) }))
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    const exited = this.exitCode !== undefined
    this.toggleState('exited', exited)
    this.toggleState('find-open', this.findOpen)
    this.toggleState('tab-moves-focus', this.tabMovesFocus)
    if (
      this.renderer &&
      (changed.has('columns') ||
        changed.has('rows') ||
        changed.has('readOnly') ||
        changed.has('exitCode') ||
        changed.has('screenReaderMode'))
    ) {
      this.renderer.settings?.(this.settings)
    }
    if (this.renderer && (changed.has('inputLabel') || changed.has('tabHintLabel'))) {
      this.nameInput()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeys, { capture: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeys, { capture: true })
    clearTimeout(this.ringing)
  }

  /** The built-in controls, or nothing where `controls` keeps none. */
  protected renderControls(): TemplateResult | typeof nothing {
    const find = this.draws('find')
    const copied = this.draws('copy')
    const clear = this.draws('clear')
    const fullscreen = this.draws('fullscreen')
    if (!find && !copied && !clear && !fullscreen) {
      return nothing
    }
    return html`<div part="controls" role="group" aria-label=${this.controlsLabel}>
      ${
        find
          ? html`<button
              part="find"
              aria-expanded=${this.findOpen ? 'true' : 'false'}
              aria-label=${this.findLabel}
              type="button"
              @click=${() => (this.findOpen ? this.closeFind() : void this.openFind())}
            >
              <slot name="find-icon">${drawIcon(magnifyingGlass)}</slot>
            </button>`
          : nothing
      }
      ${
        copied
          ? html`<button
              part="copy"
              aria-label=${this.copyLabel}
              ?disabled=${!this.anySelected}
              type="button"
              @click=${() => void this.copySelection()}
            >
              <slot name="copy-icon">${drawIcon(copy)}</slot>
            </button>`
          : nothing
      }
      ${
        clear
          ? html`<button part="clear" aria-label=${this.clearLabel} type="button" @click=${() => this.clear()}>
              <slot name="clear-icon">${drawIcon(broom)}</slot>
            </button>`
          : nothing
      }
      ${
        fullscreen
          ? html`<button
              part="fullscreen"
              aria-label=${this.fullscreenLabel}
              aria-pressed=${this.filled ? 'true' : 'false'}
              type="button"
              @click=${() => void this.fullscreen.toggle()}
            >
              <slot name="fullscreen-icon">${drawIcon(cornersOut)}</slot>
            </button>`
          : nothing
      }
    </div>`
  }

  /** The find bar, kept in the tree while closed so its field keeps what was typed. */
  protected renderFind(): TemplateResult | typeof nothing {
    if (!this.draws('find')) {
      return nothing
    }
    return html`<div part="find-bar" role="search" aria-label=${this.findLabel} ?hidden=${!this.findOpen}>
      <input
        part="find-field"
        aria-label=${this.findLabel}
        autocomplete="off"
        placeholder=${this.findLabel}
        spellcheck="false"
        type="search"
        .value=${live(this.query)}
        @input=${this.handleFindInput}
        @keydown=${this.handleFindKeys}
      />
      <span part="find-count" aria-hidden="true">${this.countText}</span>
      <slot name="find-actions" part="find-actions"></slot>
      <button
        part="find-previous"
        aria-label=${this.findPreviousLabel}
        ?disabled=${!this.matchCount}
        type="button"
        @click=${() => this.search(true)}
      >
        <slot name="find-previous-icon">${drawIcon(caretUp)}</slot>
      </button>
      <button
        part="find-next"
        aria-label=${this.findNextLabel}
        ?disabled=${!this.matchCount}
        type="button"
        @click=${() => this.search(false)}
      >
        <slot name="find-next-icon">${drawIcon(caretDown)}</slot>
      </button>
      <button part="find-close" aria-label=${this.findCloseLabel} type="button" @click=${() => this.closeFind()}>
        <slot name="find-close-icon">${drawIcon(x)}</slot>
      </button>
    </div>`
  }

  /**
   * One probe for each color `look()` reads, each painted in its property,
   * inside a box painted transparent: a property nothing sets leaves its probe
   * the box's color, which is how an unset one is told from a set one. Hidden,
   * and read only by `look()`.
   */
  protected renderLook(): TemplateResult {
    return html`<span data-look hidden aria-hidden="true" style="color: transparent">
      <span data-color="active-match" style="color: var(--terminal-active-match-background-color)"></span>
      <span data-color="active-match-border" style="color: var(--terminal-active-match-border-color)"></span>
      <span data-color="background" style="color: var(--terminal-background-color)"></span>
      <span data-color="cursor" style="color: var(--terminal-cursor-color)"></span>
      <span data-color="foreground" style="color: var(--terminal-color)"></span>
      <span data-color="match" style="color: var(--terminal-match-background-color)"></span>
      <span data-color="scrollbar" style="color: var(--terminal-scrollbar-thumb-color)"></span>
      <span data-color="selection" style="color: var(--terminal-selection-background-color)"></span>
      ${ANSI.map((name) => html`<span data-color=${name} style="color: var(--terminal-ansi-${name})"></span>`)}
      ${ANSI.map(
        (name) =>
          html`<span data-color=${`bright-${name}`} style="color: var(--terminal-ansi-bright-${name})"></span>`,
      )}
    </span>`
  }

  /** The status line: how the process exited and Restart, and what Tab does while it moves focus. */
  protected renderStatus(): TemplateResult {
    const exited = this.exitCode !== undefined
    return html`<div part="status" ?hidden=${!exited && !this.tabMovesFocus}>
      ${
        exited
          ? html`<span>${formatWords(this, 'exitedLabel', { code: String(this.exitCode ?? 0) })}</span>
              <button part="restart" type="button" @click=${this.handleRestart}>
                <slot name="restart-icon">${drawIcon(arrowClockwise)}</slot>${this.restartLabel}
              </button>
              <slot name="exit-actions" part="exit-actions"></slot>`
          : nothing
      }
      ${this.tabMovesFocus ? html`<span>${formatWords(this, 'tabMovesFocusLabel', { key: this.tabKey })}</span>` : nothing}
    </div>`
  }

  protected override render(): TemplateResult {
    const controls = this.renderControls()
    const headed = this.label !== '' || this.hasLabel || this.hasActions || controls !== nothing
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || this.getAttribute('aria-label') || this.fallbackLabel}
    >
      <div part="header" ?hidden=${!headed}>
        <slot name="label" part="label" @slotchange=${this.handleLabel}>${this.label}</slot>
        <slot name="actions" part="actions" @slotchange=${this.handleActions}></slot>
        ${controls}
      </div>
      ${this.renderFind()}
      <div part="viewport"><slot></slot></div>
      ${this.renderStatus()}
      <span part="live" role="status">${keyed(this.said, this.announcement)}</span>
    </div>
    ${this.renderLook()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-terminal': HelixHeadlessTerminal
  }
}
