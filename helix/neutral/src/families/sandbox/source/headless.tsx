import { callback, cancelable, headless, object, Repeat, Text, View, web } from '../../../render.js'

/**
 * Sandbox Source's headless tier: a pane of source, colored by the
 * highlighter a page brings, numbered by line where `line-numbers` asks.
 *
 * **Core reads the source**, the same on both platforms: `tokenize`'s runs,
 * drawn as the source alone where they do not add up to it or it throws, and
 * cut into lines. The web draws them under a transparent field a reader types
 * in. A phone draws them as text a reader selects and copies, a paragraph to
 * each line beside its number.
 *
 * **A phone's pane is read only.** Its source is what `value` holds, and the
 * field, its keys, its brackets, its completions, and the events of an edit
 * are the web's, as `readonly` makes them on the web. Where a sandbox holds
 * several panes, the one shown is the one its file tabs chose.
 *
 * **What a screen reader hears.** The web's field is named by `field-label`,
 * with the pane's `label` after it by `field-name-label`. A phone's pane is
 * one piece of text under the same name, the source read as it stands.
 *
 * **Held to `helix-sandbox-source`.** `helix system check` compares the
 * props, the events, the states, and the parts with what the manifest says
 * the element has.
 */
export default headless('sandbox-source', {
  props: {
    closeBrackets: web(false),
    complete: web(false),
    completions: web(object()),
    completionsLabel: web('Completions'),
    fieldLabel: 'Example source',
    fieldNameLabel: '{field}, {name}',
    keysDescription: web('Tab inserts two spaces. To leave the field, press Escape, then Tab.'),
    label: '',
    lineNumbers: false,
    matchBrackets: web(false),
    name: 'html',
    readonly: false,
    tabIndents: web(true),
    tokenize: callback(
      '(source: string, name: string) => readonly import("@fusion.dev/helix-core/sandbox").SandboxToken[]',
    ),
    value: '',
  },
  events: {
    beforeEdit: cancelable(['value']),
    caret: ['column', 'line'],
    edit: ['value'],
  },
  states: ['modified', 'settled'],
  sandbox: {
    lines: 'lines',
    named: 'named',
  },
  render: ({ entry, props, sandbox }) => (
    <View part="field">
      <View
        ariaHidden
        part="highlight"
        platform="web"
      >
        <View part="line" />
        <View part="token" />
        <View
          also={{ 'bracket-unmatched': true }}
          part="bracket"
        />
      </View>
      <View
        label={sandbox.named}
        part="source"
        readonly={props.readonly}
      >
        <Repeat
          each={sandbox.lines}
          key="key"
          part="lines"
        >
          <View
            data-numbered={props.lineNumbers}
            part="row"
            platform="native"
            style={{ '--sandbox-source-digits': entry.digits }}
          >
            {props.lineNumbers && (
              <View
                ariaHidden
                part="number"
              >
                <Text part="number-words">{entry.number}</Text>
              </View>
            )}
            <View
              part="words"
              run
            >
              <Repeat
                each={entry.runs}
                key="key"
                part="runs"
              >
                <View
                  data-kind={entry.kind}
                  part="run"
                  run
                >
                  <Text part="run-words">{entry.text}</Text>
                </View>
              </Repeat>
            </View>
          </View>
        </Repeat>
      </View>
      <View
        label={props.completionsLabel}
        part="completions"
        platform="web"
        role="listbox"
      >
        <View
          also={{ 'completion-active': true }}
          part="completion"
        />
      </View>
    </View>
  ),
})
