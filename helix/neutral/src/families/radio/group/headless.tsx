import {
  bare,
  cancelable,
  headless,
  oneOf,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Radio Group's headless tier: the question, the radios that answer it, and
 * the line under them.
 *
 * **The group is the form control, and the radios are its choices.** It
 * holds the answer in `value`, seeded by `default-value`. A radio's
 * `before-select` reaches the group, then the group asks with `before-change`, and once the
 * answer has moved it sends `input` and `change`.
 *
 * **One stop for the keys.** Right and Down choose the next radio, from the
 * last back to the first, Left and Up the one before, and Home and End the
 * ends, passing over a disabled radio. A typed letter moves nothing, as on
 * the web. A read-only group moves focus with the keys and chooses nothing,
 * and a disabled group disables every radio.
 *
 * **A required group with nothing chosen** shows its message once the
 * reader has chosen and cleared, or asked for the verdict, as a checkbox
 * does.
 */
export default headless('radio-group', {
  props: {
    ariaLabel: string(),
    defaultValue: '',
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    /* A form's, which a phone has none of. */
    name: web(''),
    orientation: oneOf(['horizontal', 'vertical']),
    readonly: false,
    required: false,
    value: string(),
    valueMissingMessage: 'Choose one to continue.',
  },
  events: {
    beforeChange: cancelable(['value']),
    /* A radio's choice, which reaches the group before the group acts on it. */
    beforeSelect: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['invalid', 'settled'],
  collection: {
    defaultProp: 'defaultValue',
    disabled: 'disabled',
    keys: { loop: true, selectionFollowsFocus: true, typeahead: false },
    onBeforeChange: 'beforeChange',
    onChange: ['input', 'change'],
    optional: true,
    prop: 'value',
    readonly: 'readonly',
  },
  validation: { feedback: 'feedback', required: 'required', valueMissing: 'valueMissingMessage' },
  render: ({ props, state }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <View
        label={props.label}
        orientation={props.orientation}
        part="items"
        role="radiogroup"
      >
        <Slot />
      </View>
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
