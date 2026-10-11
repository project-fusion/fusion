import { ariaChord, type ChordPress, matchesChord } from '@fusion.dev/helix-core'

/** What a terminal frame does with a key press before the program sees it. */
export type TerminalShortcut = 'copy' | 'find' | 'paste' | 'tab-focus'

/**
 * The chords a terminal frame takes for itself, on an Apple keyboard and on
 * every other.
 *
 * **Every other key reaches the program**, which is what a terminal is for:
 * Tab completes, Escape interrupts an agent and leaves an editor's insert
 * mode, and Control with a letter is a signal. So the frame keeps to the
 * chords terminal applications already keep for themselves: Command with a
 * letter on a Mac, and Control and Shift with a letter elsewhere, which a
 * program cannot tell from Control and the letter alone.
 *
 * **Copy is the browser's own on a Mac**, Command+C copying the selection
 * through the renderer's `copy` handler, so there is nothing to take.
 *
 * **So is paste, everywhere.** Control+Shift+V pastes as plain text in the
 * browser, and the renderer takes a paste as typed input, in bracketed paste
 * mode where the program asked for it. The frame only keeps the press from
 * the program, which would read it as Control+V. Command+V on a Mac is the
 * browser's with nothing to keep.
 *
 * **Tab's way out is VS Code's.** The sandbox's source pane hands the next
 * Tab to the page after Escape, and a terminal cannot: Escape reaches the
 * program first, where it interrupts an agent, and readline reads the key
 * after it as a Meta key. So one chord switches Tab between typing in the
 * terminal and moving focus, Control+M, which sends the same byte as Enter,
 * and Control+Shift+M on a Mac.
 */
const CHORDS: Record<'apple' | 'other', Record<TerminalShortcut, string | undefined>> = {
  apple: { copy: undefined, find: 'cmd+f', paste: undefined, 'tab-focus': 'ctrl+shift+m' },
  other: {
    copy: 'ctrl+shift+c',
    find: 'ctrl+shift+f',
    paste: 'ctrl+shift+v',
    'tab-focus': 'ctrl+m',
  },
}

/** The chord for a shortcut on this keyboard, or `undefined` where the frame takes none. */
export const chordOf = (shortcut: TerminalShortcut, apple: boolean): string | undefined =>
  CHORDS[apple ? 'apple' : 'other'][shortcut]

/** Which shortcut a press is, or `null` for a press the program should have. */
export const shortcutOf = (press: ChordPress, apple: boolean): TerminalShortcut | null => {
  for (const shortcut of ['copy', 'find', 'paste', 'tab-focus'] as const) {
    const chord = chordOf(shortcut, apple)
    if (chord !== undefined && matchesChord(press, chord, apple)) {
      return shortcut
    }
  }
  return null
}

/**
 * A chord as a reader says it, such as "Control+Shift+M": the key names
 * `aria-keyshortcuts` uses, which a screen reader reads aloud whole.
 */
export const spokenChord = (shortcut: TerminalShortcut, apple: boolean): string => {
  const chord = chordOf(shortcut, apple)
  return chord === undefined ? '' : ariaChord(chord, apple).replace('Meta', 'Command')
}

/** Whether a press is a bare Tab or Shift+Tab, which moves focus while Tab is set to. */
export const isTab = (press: ChordPress): boolean =>
  press.key === 'Tab' && !press.altKey && !press.ctrlKey && !press.metaKey
