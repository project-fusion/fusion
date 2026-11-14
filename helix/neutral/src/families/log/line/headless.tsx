import {
  headless,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  Text,
  View,
} from '../../../render.js'

/**
 * One line of a log, in its headless tier: its number, its time, its words, and
 * how many times it was written.
 *
 * **What the log says of a line reaches it two ways**: through a context, for a
 * line passed in, and `logRow`, for a line the log draws from data. A line is the
 * same drawing either way.
 *
 * **A number is a link with `line-href`, a press where the log is `selectable`,
 * and otherwise words nobody hears**, as the web's are.
 *
 * **A run is a stretch of words in one ANSI style**, nested in the line's text so
 * it wraps with the rest. A color a run names stands in the rules, by name, and
 * any other reaches the rule through `--log-run-color`.
 *
 * **What a screen reader hears.** The web says the level in words a clip hides
 * and a count in words beside the number. A phone says both in the line's label,
 * so a reader meets a line as one thing.
 *
 * **Held to `helix-log-line`.** `helix system check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has. `logRow` is a property the web's element has no use for.
 */
export default headless('log-line', {
  props: {
    at: '',
    level: oneOf(['debug', 'error', 'info', 'log', 'warn']),
    levelWords: object(),
    lineLabel: 'Line {number}',
    logRow: property(object()),
    timesLabel: '{count} times',
  },
  states: ['filtered', 'settled'],
  logLine: {
    at: 'at',
    countHidden: 'countHidden',
    countWords: 'countWords',
    count: 'count',
    debug: 'debug',
    digits: 'digits',
    error: 'error',
    grouped: 'grouped',
    heard: 'heard',
    level: 'level',
    levelHidden: 'levelHidden',
    levelWords: 'levelWords',
    lineLabel: 'lineLabel',
    linked: 'linked',
    logRow: 'logRow',
    marked: 'marked',
    numberName: 'numberName',
    numberWords: 'numberWords',
    plainNumber: 'plainNumber',
    pressNumber: 'pressNumber',
    runs: 'runs',
    selected: 'selected',
    timeHidden: 'timeHidden',
    timesLabel: 'timesLabel',
    timeWords: 'timeWords',
    unnumbered: 'unnumbered',
    unwrapped: 'unwrapped',
    warn: 'warn',
    written: 'written',
  },
  render: ({ entry, logLine }) => (
    <View
      also={{
        'line-debug': logLine.debug,
        'line-error': logLine.error,
        'line-grouped': logLine.grouped,
        'line-marked': logLine.marked,
        'line-selected': logLine.selected,
        'line-warn': logLine.warn,
      }}
      data-unnumbered={logLine.unnumbered}
      label={logLine.heard}
      part="line"
      style={{ '--log-digits': logLine.digits }}
    >
      {logLine.plainNumber && (
        <View
          ariaHidden
          data-selected={logLine.selected}
          part="number"
        >
          <Text part="number-words">{logLine.numberWords}</Text>
        </View>
      )}
      {logLine.pressNumber && (
        <Pressable
          data-linked={logLine.linked}
          data-selected={logLine.selected}
          label={logLine.numberName}
          part="number"
        >
          <Text part="number-words">{logLine.numberWords}</Text>
        </Pressable>
      )}
      <View
        hidden={logLine.timeHidden}
        part="time"
      >
        <Text part="time-words">{logLine.timeWords}</Text>
      </View>
      <View
        part="level"
        platform="web"
      >
        <Text part="level-words">{logLine.levelWords}</Text>
      </View>
      <View
        data-unwrapped={logLine.unwrapped}
        part="text"
        run
      >
        <Slot />
        <Repeat
          each={logLine.runs}
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
            data-match={entry.match}
            part="run"
            run
            style={{
              '--log-run-background-color': entry.backgroundValue,
              '--log-run-color': entry.colorValue,
            }}
          >
            <Text part="run-words">{entry.text}</Text>
          </View>
        </Repeat>
        <View
          part="match"
          platform="web"
        />
      </View>
      <View
        ariaHidden
        hidden={logLine.countHidden}
        part="count"
      >
        <Text part="count-words">{logLine.count}</Text>
      </View>
      <View
        part="count-label"
        platform="web"
      >
        <Text part="count-label-words">{logLine.countWords}</Text>
      </View>
    </View>
  ),
})
