import {
  Announce,
  boolean,
  callback,
  cancelable,
  headless,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * Log's headless tier: output that arrives while a reader watches it, in a box
 * that follows the newest line until the reader scrolls away.
 *
 * **Lines arrive two ways, and core reads both.** `Log.Line` and `Log.Group`
 * passed in stand in the box, or `write`, `writeLine`, `lines`, and `source`
 * hand it text, which core's `LogBuffer` and `logRows` read into the rows of a
 * window, the same on both platforms.
 *
 * **The `tail` machine follows the newest line**, by core's arithmetic, and Log
 * draws in the box it follows. It holds the reader's place as `limit` lets older
 * lines go with `maintainVisibleContentPosition`.
 *
 * **A phone scrolls both ways**, a line past the edge of the box running on,
 * until `wrap` is set.
 *
 * **What a screen reader hears.** The web says `log`. iOS and Android have no
 * trait for one, so a phone reads the lines in order. Each line says its level
 * with its words, and what a web's status region says, a phone announces.
 *
 * **The web's**: a `ReadableStream` `source`, where a phone takes an async
 * iterable, a selection in the page's address, and the drawn scrollbars.
 *
 * **Held to `helix-log`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('log', {
  props: {
    collapse: false,
    defaultPinned: true,
    done: false,
    doneLabel: 'Finished',
    droppedLabel: '{count, plural, one {# earlier line is} other {# earlier lines are}} not kept',
    emptyText: 'No output yet',
    errorLabel: '{count, plural, one {Error} other {# errors}}: {text}',
    fallbackLabel: 'Output',
    format: oneOf(['github-actions', 'vercel']),
    groupLabel: '{status, select, failed {{heading} failed} other {{heading} finished}}',
    groups: property(object()),
    label: '',
    level: oneOf(['debug', 'error', 'info', 'log', 'warn']),
    limit: 0,
    lineHref: '',
    lineLabel: 'Line {number}',
    lineNumbers: false,
    lines: property(object()),
    loading: false,
    loadingText: 'Loading',
    markLines: '',
    matchesLabel: '{count, plural, =0 {No lines match} one {# line matches} other {# lines match}}',
    parse: property(callback('(text: string) => unknown')),
    pinned: boolean(),
    query: '',
    quiet: false,
    resumeLabel: 'Jump to latest',
    selectable: false,
    selectedLines: '',
    separation: oneOf(['outlined', 'plain']),
    source: property(object()),
    threshold: 48,
    timestamps: oneOf(['absolute', 'relative']),
    wrap: false,
  },
  events: {
    beforePin: cancelable(['value']),
    beforeSelect: cancelable(['value']),
    expand: ['value'],
    pin: ['value'],
    select: ['value'],
  },
  states: ['done', 'empty', 'filtered', 'pinned', 'settled'],
  tail: {
    away: 'away',
    defaultPinned: 'defaultPinned',
    following: 'following',
    onBeforePin: 'beforePin',
    onPin: 'pin',
    pinned: 'pinned',
    resume: 'resumeButton',
    threshold: 'threshold',
  },
  logRoot: {
    blank: 'blank',
    busy: 'busy',
    collapse: 'collapse',
    digits: 'digits',
    done: 'done',
    doneLabel: 'doneLabel',
    droppedHidden: 'droppedHidden',
    droppedLabel: 'droppedLabel',
    droppedWords: 'droppedWords',
    emptyText: 'emptyText',
    errorLabel: 'errorLabel',
    fallbackLabel: 'fallbackLabel',
    format: 'format',
    groupLabel: 'groupLabel',
    groups: 'groups',
    label: 'label',
    level: 'level',
    limit: 'limit',
    lineHref: 'lineHref',
    lineLabel: 'lineLabel',
    lineNumbers: 'lineNumbers',
    lines: 'lines',
    list: 'rows',
    markLines: 'markLines',
    matchesLabel: 'matchesLabel',
    named: 'named',
    onBeforeSelect: 'beforeSelect',
    onExpand: 'expand',
    onSelect: 'select',
    parse: 'parse',
    query: 'query',
    quiet: 'quiet',
    scrolls: 'scrolls',
    selectable: 'selectable',
    selectedLines: 'selectedLines',
    source: 'source',
    timestamps: 'timestamps',
    wrap: 'wrap',
  },
  render: ({ entry, logRoot, props, tail }) => (
    <>
      <Slot
        name="toolbar"
        part="toolbar"
      />
      <View
        hidden={logRoot.droppedHidden}
        part="dropped"
      >
        <Text part="dropped-words">{logRoot.droppedWords}</Text>
      </View>
      <View
        busy={logRoot.busy}
        data-scrolls={logRoot.scrolls}
        label={logRoot.named}
        part="log"
        role="log"
      >
        <View
          part="before"
          platform="web"
        />
        {/* The first thing a windowed repeat holds is a copy for each row, and
            what follows stands after the rows, inside what scrolls. */}
        <Repeat
          each={logRoot.list}
          key="key"
          part="rows"
          windowed
        >
          <View part="row">
            <Wrap
              draws="log-group"
              exports={{
                content: true,
                duration: true,
                heading: true,
                mark: true,
                status: true,
                summary: true,
                'summary-done': true,
                'summary-failed': true,
                'summary-pending': true,
                'summary-running': true,
                'summary-skipped': true,
              }}
              part="group"
              when={entry.isGroup}
            />
            <Wrap
              draws="log-line"
              exports={{
                count: true,
                'count-label': true,
                debug: true,
                error: true,
                grouped: true,
                level: true,
                marked: true,
                match: true,
                number: true,
                run: true,
                'run-bold': true,
                'run-dim': true,
                'run-italic': true,
                'run-strike': true,
                'run-underline': true,
                selected: true,
                text: true,
                time: true,
                warn: true,
              }}
              part="line"
              when={entry.isLine}
            />
          </View>
          {props.loading && (
            <View part="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </View>
          )}
          {logRoot.blank && (
            <View part="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </View>
          )}
        </Repeat>
        <View
          part="after"
          platform="web"
        />
        <Slot />
      </View>
      <Announce
        part="live"
        platform="web"
      />
      <View
        hidden={tail.following}
        part="resume"
      >
        <Slot name="resume">
          <Pressable
            part="resume-button"
            role="button"
          >
            <View
              ariaHidden
              icon="arrow-down"
              part="resume-mark"
            />
            <Text part="resume-words">{props.resumeLabel}</Text>
          </Pressable>
        </Slot>
      </View>
    </>
  ),
})
