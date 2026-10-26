import {
  bare,
  boolean,
  cancelable,
  headless,
  Path,
  Pressable,
  Slot,
  Svg,
  set,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Checkbox's headless tier: what it takes, what it sends, and its parts.
 *
 * **The row is the press on a phone.** On the web the native input inside
 * the box takes the press and the focus, and the `<label>` around the row
 * forwards a press on the words to it. A phone has no input to forward to, so
 * the row itself is the checkbox a screen reader reaches, checked, unchecked,
 * or mixed. Space turns it, and Enter does not, as on the web. The input is
 * the box a phone draws, under the mark.
 *
 * **The mark is the tick, or the dash while the box is mixed.** The web draws
 * each as a mask over the mark, and a phone draws the same path as a vector,
 * at the same weight. An icon passed into `check` or `dash` takes its place.
 *
 * **The hint and the message share one line under the row**, as Switch's do.
 *
 * **In a Checkbox Group, the box joins the group's set** and still turns on
 * its own. Its turn asks the group once its own `before-check` stands, and
 * the group's disabled disables it.
 */
export default headless('checkbox', {
  memberOf: set('checkbox-group'),
  props: {
    ariaLabel: string(),
    checked: boolean(),
    defaultChecked: false,
    disabled: false,
    feedback: '',
    hint: '',
    indeterminate: false,
    label: '',
    /* A form's, which a phone has none of. */
    name: web(''),
    readonly: false,
    required: false,
    value: 'on',
    valueMissingMessage: 'Tick this box to continue.',
  },
  events: {
    beforeCheck: cancelable(['checked']),
    change: bare(),
    input: bare(),
  },
  states: ['checked', 'hasCheck', 'hasDash', 'hasLabel', 'indeterminate', 'invalid', 'settled'],
  toggle: {
    defaultProp: 'defaultChecked',
    indeterminate: 'indeterminate',
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
        keys="space"
        label={props.ariaLabel}
        part="field"
        readonly={props.readonly}
        required={props.required}
        role="checkbox"
        toggles
      >
        <View part="box">
          <View part="control" />
          <View
            also={{
              'mark-checked': props.checked,
              'mark-dash': props.indeterminate,
              'mark-indeterminate': props.indeterminate,
            }}
            ariaHidden
            part="mark"
          >
            {!props.indeterminate ? (
              <Slot name="check">
                <Svg
                  part="tick"
                  platform="native"
                  viewBox="0 0 24 24"
                >
                  <Path
                    d="M6 12.5 10.2 16.7 18 8.4"
                    part="tick-line"
                  />
                </Svg>
              </Slot>
            ) : (
              <Slot name="dash">
                <Svg
                  part="dash-mark"
                  platform="native"
                  viewBox="0 0 24 24"
                >
                  <Path
                    d="M7 12h10"
                    part="dash-line"
                  />
                </Svg>
              </Slot>
            )}
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
