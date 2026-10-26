import {
  bare,
  boolean,
  cancelable,
  headless,
  Pressable,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Switch's headless tier: what it takes, what it sends, and its parts.
 *
 * **The row is the press on a phone.** On the web the input over the track
 * takes the press and the focus, and the `<label>` around the row forwards
 * a press on the words to it. A phone has no input to forward to, so the row
 * itself is the switch a screen reader reaches, and the input is the web's
 * alone. Space turns it, and Enter does not, as on the web.
 *
 * **The thumb holds an icon for each state**, and the one for the other
 * state is hidden. The tree describes the styled element, whose thumb the
 * headless tier leaves out.
 *
 * **The hint and the message share one line under the row.** The message
 * takes the hint's place while a failure shows, and a missing answer shows
 * once the reader has turned the switch or asked for the verdict.
 */
export default headless('switch', {
  props: {
    ariaLabel: string(),
    checked: boolean(),
    defaultChecked: false,
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    /* A form's, which a phone has none of. */
    name: web(''),
    readonly: false,
    required: false,
    value: 'on',
    valueMissingMessage: 'Turn this on to continue.',
  },
  events: {
    beforeCheck: cancelable(['checked']),
    change: bare(),
    input: bare(),
  },
  states: ['checked', 'invalid', 'settled'],
  toggle: {
    defaultProp: 'defaultChecked',
    onBeforeChange: 'beforeCheck',
    onChange: ['input', 'change'],
    prop: 'checked',
    readonly: 'readonly',
  },
  validation: { feedback: 'feedback', required: 'required', valueMissing: 'valueMissingMessage' },
  render: ({ props, state }) => (
    <>
      <Pressable
        disabled={props.disabled}
        label={props.ariaLabel}
        part="field"
        pressKey="space"
        readonly={props.readonly}
        required={props.required}
        role="switch"
        toggles
      >
        <View part="track">
          <Pressable
            checked={props.checked}
            part="control"
            platform="web"
            role="switch"
          />
          <View
            ariaHidden
            part="thumb"
          >
            <Slot
              hidden={!props.checked}
              name="on"
            />
            <Slot
              hidden={props.checked}
              name="off"
            />
          </View>
        </View>
        <View part="label">
          <Slot>
            <Text part="label-text">{props.label}</Text>
          </Slot>
        </View>
      </Pressable>
      {!state.invalid ? (
        <Wrap
          part="hint"
          when={props.hint}
        >
          <Slot name="hint">
            <Text part="hint-text">{props.hint}</Text>
          </Slot>
        </Wrap>
      ) : (
        <View
          part="feedback"
          role="alert"
        >
          <Slot name="feedback">
            <Text part="feedback-text">{props.valueMissingMessage}</Text>
          </Slot>
        </View>
      )}
    </>
  ),
})
