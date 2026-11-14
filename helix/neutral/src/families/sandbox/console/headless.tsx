import {
  Announce,
  bare,
  cancelable,
  headless,
  object,
  oneOf,
  string,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * Sandbox Console's headless tier: what a preview writes to its console, a
 * line to each call, in a log that keeps the newest 200.
 *
 * **Lines arrive by `write`**, which the sandbox calls for each `console`
 * event its preview sends, and `clear` empties the log. A line the same as
 * the one before it is counted on that line. On a phone the same two methods
 * stand on the console's ref, since a phone has no preview to listen to.
 *
 * **`level` hides the quieter lines**, and `controls` draws a filter for it
 * with a button that clears the log. A change of level asks with
 * `before-change` and tells with `change`.
 *
 * **What a screen reader hears.** The newest five lines that differ from the
 * one before, each after its level's word from `spoken-words`, so a burst of
 * output is not read as a backlog. The log itself is quiet.
 *
 * **The web's**: the level filter, a `<select>` beside the clear button, since
 * a phone's sandbox is read only and its console shows the level the page
 * sets.
 *
 * **Held to `helix-sandbox-console`.** `helix system check` compares the
 * props, the events, the states, and the parts with what the manifest says
 * the element has.
 */
export default headless('sandbox-console', {
  props: {
    clearLabel: 'Clear',
    controls: false,
    emptyLabel: string(),
    emptyText: 'Nothing written to the console yet.',
    fallbackLabel: 'Console output',
    label: '',
    level: oneOf(['error', 'info', 'log', 'warn']),
    levelLabel: 'Levels shown',
    levelWords: object(),
    spokenWords: object(),
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
  },
  states: ['settled'],
  sandbox: {
    heard: 'heard',
    named: 'named',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    said: 'said',
  },
  render: ({ props, sandbox }) => (
    <>
      {props.controls && (
        <View part="controls">
          <View
            label={props.levelLabel}
            part="filter"
            platform="web"
          />
          <Wrap
            draws="button"
            exports={{
              button: true,
              live: true,
              spinner: true,
              text: true,
            }}
            part="clear"
          >
            <Text part="clear-words">{props.clearLabel}</Text>
          </Wrap>
        </View>
      )}
      <Wrap
        draws="log"
        exports={{
          after: true,
          before: true,
          dropped: true,
          empty: true,
          group: true,
          'group-content': true,
          'group-duration': true,
          'group-heading': true,
          'group-mark': true,
          'group-status': true,
          'group-summary': true,
          'group-summary-done': true,
          'group-summary-failed': true,
          'group-summary-pending': true,
          'group-summary-running': true,
          'group-summary-skipped': true,
          line: true,
          'line-count': true,
          'line-count-label': true,
          'line-debug': true,
          'line-error': true,
          'line-grouped': true,
          'line-level': true,
          'line-marked': true,
          'line-match': true,
          'line-number': true,
          'line-run': true,
          'line-run-bold': true,
          'line-run-dim': true,
          'line-run-italic': true,
          'line-run-strike': true,
          'line-run-underline': true,
          'line-selected': true,
          'line-text': true,
          'line-time': true,
          'line-warn': true,
          live: true,
          loading: true,
          log: true,
          resume: true,
          'resume-button': true,
          'resume-mark': true,
          row: true,
          toolbar: true,
        }}
        gives={{
          collapse: true,
          emptyText: sandbox.said,
          label: sandbox.named,
          level: props.level,
          quiet: true,
          separation: 'plain',
          wrap: true,
        }}
        part="output"
      />
      <View
        part="live"
        platform="web"
      />
      <Announce
        part="heard"
        platform="native"
      >
        {sandbox.heard}
      </Announce>
    </>
  ),
})
