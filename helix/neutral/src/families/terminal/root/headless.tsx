import {
  Announce,
  cancelable,
  headless,
  number,
  Repeat,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
} from '../../../render.js'

/**
 * Terminal's headless tier: a frame around a terminal's screen, with a header
 * for its name and its controls, a find bar, and a status line once the
 * process exits.
 *
 * **The web hands the screen to a renderer**, xterm.js through
 * `connectTerminal`, which draws it in the default region. **A phone draws
 * the screen itself**, from `@xterm/headless`, xterm's parser and buffer with
 * no page, an optional peer the app installs: each line as runs of text in
 * the colors the theme gives the sixteen ANSI colors, so a screen reader
 * reads it and a reader selects it, the scrollback in a window that follows
 * the newest line, and the reader's keys through a field the screen focuses
 * on a press. Without the peer, a phone draws what was written as read-only
 * lines.
 *
 * **Output arrives by `write`**, on the ref on both platforms, and the reader's
 * typing leaves by `terminal-input`. `exit-code` says the process exited: the
 * status line says how, input stops, and Restart asks with
 * `terminal-restart`.
 *
 * **The find bar** searches the scrollback and says the count: the web's is a
 * Find, and a phone's is a field, the count, and the buttons that move between
 * matches. **The web's**: the copy and fullscreen controls, the match options'
 * buttons, the chords, Tab's way out, links, and `screen-reader-mode`, which
 * a phone does not need since its lines are text.
 *
 * **Held to `helix-terminal`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('terminal', {
  props: {
    clearLabel: 'Clear',
    columns: number(),
    controls: string(),
    controlsLabel: 'Terminal controls',
    copiedLabel: 'Copied',
    copyLabel: 'Copy',
    exitCode: number(),
    exitedLabel:
      '{code, select, 0 {The process exited.} other {The process exited with code {code}.}}',
    fallbackLabel: 'Terminal',
    findCloseLabel: 'Close find',
    findControlsLabel: 'Find controls',
    findInvalidLabel: 'Not a valid regular expression',
    findLabel: 'Find',
    findMatchCase: false,
    findMatchCaseLabel: 'Match case',
    findNextLabel: 'Next match',
    findPreviousLabel: 'Previous match',
    findRegex: false,
    findRegexLabel: 'Use regular expression',
    findWholeWord: false,
    findWholeWordLabel: 'Match whole word',
    fullscreenLabel: 'Fill the screen',
    inputLabel: 'Terminal input',
    label: '',
    matchesLabel:
      '{count, plural, =0 {No matches} one {{index} of # match} other {{index} of # matches}}',
    readonly: false,
    restartLabel: 'Restart',
    rows: number(),
    screenReaderMode: false,
    tabHintLabel: 'Press {key} to move focus with Tab.',
    tabMovesFocusLabel: 'Tab moves focus. Press {key} to type Tab in the terminal.',
    tabTypesLabel: 'Tab types in the terminal.',
  },
  events: {
    copy: ['value'],
    found: ['count', 'index'],
    terminalBell: [],
    terminalInput: ['binary', 'data'],
    terminalLink: cancelable(['href']),
    terminalResize: ['columns', 'height', 'rows', 'width'],
    terminalRestart: [],
    terminalTitle: ['title'],
  },
  states: ['bell', 'exited', 'findOpen', 'fullscreen', 'settled', 'tabMovesFocus'],
  terminal: {
    clears: 'clears',
    count: 'count',
    exited: 'exited',
    findOpen: 'findOpen',
    finds: 'finds',
    headed: 'headed',
    lines: 'lines',
    named: 'named',
    onFound: 'found',
    onTerminalBell: 'terminalBell',
    onTerminalInput: 'terminalInput',
    onTerminalResize: 'terminalResize',
    onTerminalRestart: 'terminalRestart',
    onTerminalTitle: 'terminalTitle',
    said: 'said',
    status: 'status',
    title: 'title',
  },
  render: ({ entry, props, terminal }) => (
    <View
      label={terminal.named}
      part="region"
      role="group"
    >
      <View
        hidden={!terminal.headed}
        part="header"
      >
        <Slot
          name="label"
          part="label"
          platform="web"
        />
        <View
          part="label-text"
          platform="native"
          run
        >
          <Text part="label-words">{terminal.title}</Text>
        </View>
        <Wrap
          draws="toolbar"
          exports={{ focus: true, toolbar: true }}
          gives={{ label: props.controlsLabel }}
          part="controls"
        >
          <Slot
            name="actions"
            part="actions"
          />
          {terminal.finds && (
            <Wrap
              draws="icon-button"
              exports={{ button: true, live: true, spinner: true, text: true }}
              gives={{ label: props.findLabel }}
              part="find-toggle"
            >
              <Slot name="find-icon">
                <View
                  draws="icon"
                  gives={{ name: 'magnifying-glass' }}
                  part="find-mark"
                  platform="native"
                />
              </Slot>
            </Wrap>
          )}
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.copyLabel }}
            part="copy"
            platform="web"
          >
            <Slot name="copy-icon" />
          </Wrap>
          {terminal.clears && (
            <Wrap
              draws="icon-button"
              exports={{ button: true, live: true, spinner: true, text: true }}
              gives={{ label: props.clearLabel }}
              part="clear"
            >
              <Slot name="clear-icon">
                <View
                  draws="icon"
                  gives={{ name: 'broom' }}
                  part="clear-mark"
                  platform="native"
                />
              </Slot>
            </Wrap>
          )}
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.fullscreenLabel }}
            part="fullscreen"
            platform="web"
          >
            <Slot name="fullscreen-icon" />
          </Wrap>
          {/* The parts each button's Tooltip exports on the web. */}
          <View
            also={{
              'tooltip-arrow-bottom': true,
              'tooltip-arrow-left': true,
              'tooltip-arrow-right': true,
              'tooltip-arrow-top': true,
            }}
            part="tooltip-arrow"
            platform="web"
          />
          <View
            also={{
              'tooltip-surface-bottom': true,
              'tooltip-surface-left': true,
              'tooltip-surface-right': true,
              'tooltip-surface-top': true,
            }}
            part="tooltip-surface"
            platform="web"
          />
        </Wrap>
      </View>
      {/* The web's find bar, a Find, its parts forwarded under `find-`. */}
      <View
        also={{
          'find-actions': true,
          'find-bar': true,
          'find-close': true,
          'find-close-button': true,
          'find-close-live': true,
          'find-close-spinner': true,
          'find-close-text': true,
          'find-controls': true,
          'find-controls-focus': true,
          'find-controls-toolbar': true,
          'find-count': true,
          'find-field': true,
          'find-live': true,
          'find-match-case': true,
          'find-match-case-button': true,
          'find-match-case-live': true,
          'find-match-case-pressed': true,
          'find-match-case-spinner': true,
          'find-match-case-text': true,
          'find-next': true,
          'find-next-button': true,
          'find-next-live': true,
          'find-next-spinner': true,
          'find-next-text': true,
          'find-previous': true,
          'find-previous-button': true,
          'find-previous-live': true,
          'find-previous-spinner': true,
          'find-previous-text': true,
          'find-regex': true,
          'find-regex-button': true,
          'find-regex-live': true,
          'find-regex-pressed': true,
          'find-regex-spinner': true,
          'find-regex-text': true,
          'find-replace': true,
          'find-replace-all': true,
          'find-replace-all-button': true,
          'find-replace-all-live': true,
          'find-replace-all-spinner': true,
          'find-replace-all-text': true,
          'find-replace-button': true,
          'find-replace-field': true,
          'find-replace-live': true,
          'find-replace-spinner': true,
          'find-replace-text': true,
          'find-replace-toggle': true,
          'find-replace-toggle-button': true,
          'find-replace-toggle-live': true,
          'find-replace-toggle-mark': true,
          'find-replace-toggle-spinner': true,
          'find-replace-toggle-text': true,
          'find-whole-word': true,
          'find-whole-word-button': true,
          'find-whole-word-live': true,
          'find-whole-word-pressed': true,
          'find-whole-word-spinner': true,
          'find-whole-word-text': true,
        }}
        part="find"
        platform="web"
      >
        <Slot name="find-actions" />
        <Slot name="find-match-case-icon" />
        <Slot name="find-whole-word-icon" />
        <Slot name="find-regex-icon" />
        <Slot name="find-previous-icon" />
        <Slot name="find-next-icon" />
        <Slot name="find-close-icon" />
      </View>
      {/* A phone's find bar: the field, the count, and the buttons. */}
      <View
        hidden={!terminal.findOpen}
        part="search"
        platform="native"
      >
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          label={props.findLabel}
          part="search-field"
          placeholder={props.findLabel}
          type="search"
        />
        <View part="search-count">
          <Text part="search-count-words">{terminal.count}</Text>
        </View>
        <Wrap
          draws="icon-button"
          gives={{ label: props.findPreviousLabel }}
          part="search-previous"
        >
          <View
            draws="icon"
            gives={{ name: 'caret-up' }}
            part="search-previous-mark"
          />
        </Wrap>
        <Wrap
          draws="icon-button"
          gives={{ label: props.findNextLabel }}
          part="search-next"
        >
          <View
            draws="icon"
            gives={{ name: 'caret-down' }}
            part="search-next-mark"
          />
        </Wrap>
        <Wrap
          draws="icon-button"
          gives={{ label: props.findCloseLabel }}
          part="search-close"
        >
          <View
            draws="icon"
            gives={{ name: 'x' }}
            part="search-close-mark"
          />
        </Wrap>
      </View>
      <View part="viewport">
        <Slot platform="web" />
        <Repeat
          each={terminal.lines}
          key="key"
          part="lines"
          windowed
        >
          <View
            part="line"
            platform="native"
            run
          >
            <Repeat
              each={entry.runs}
              key="key"
              part="runs"
            >
              <View
                also={{
                  'run-bold': entry.bold,
                  'run-dim': entry.dim,
                  'run-italic': entry.italic,
                  'run-strike': entry.strike,
                  'run-underline': entry.underline,
                }}
                data-background={entry.backgroundName}
                data-color={entry.colorName}
                data-current={entry.current}
                data-cursor={entry.cursor}
                data-match={entry.match}
                part="run"
                run
                style={{
                  '--terminal-run-background-color': entry.backgroundValue,
                  '--terminal-run-color': entry.colorValue,
                }}
              >
                <Text part="run-words">{entry.text}</Text>
              </View>
            </Repeat>
          </View>
        </Repeat>
        <TextInput
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          label={props.inputLabel}
          part="input"
          platform="native"
        />
        <View
          ariaHidden
          part="flash"
          platform="native"
        />
        {/* Ten cells of the screen's face, which a phone measures its grid by. */}
        <View
          ariaHidden
          part="probe"
          platform="native"
          run
        >
          <Text part="probe-words">0000000000</Text>
        </View>
      </View>
      <View
        hidden={!terminal.exited}
        part="status"
      >
        <View
          part="status-text"
          platform="native"
          run
        >
          <Text part="status-words">{terminal.status}</Text>
        </View>
        <Wrap
          draws="button"
          exports={{ button: true, live: true, spinner: true, text: true }}
          gives={{ label: props.restartLabel }}
          part="restart"
        >
          <Slot
            name="restart-icon"
            platform="web"
          />
          <Text
            part="restart-words"
            platform="native"
          >
            {props.restartLabel}
          </Text>
        </Wrap>
        <Slot
          name="exit-actions"
          part="exit-actions"
        />
      </View>
      <Announce part="live">{terminal.said}</Announce>
    </View>
  ),
})
