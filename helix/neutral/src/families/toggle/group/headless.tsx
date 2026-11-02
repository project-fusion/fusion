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
 * Toggle Group's headless tier: a row of toggles that chooses one, or presses
 * several, with an indicator under the chosen one.
 *
 * **The group holds the answer in `value`**, seeded by `default-value` or by
 * a toggle its markup writes `selected`. A toggle's `before-select` reaches
 * the group, then the group asks with `before-change`, and once the answer has
 * moved it sends `input` and `change`. With `allow-empty-selection`, a press
 * on the chosen toggle takes it back.
 *
 * **Under `selection-mode="multiple"`, each toggle presses on its own.**
 * `value` holds the pressed values, separated by commas, the group is a
 * toolbar of toggle buttons, and the indicator stays hidden. A toolbar around
 * the group makes it a group of that toolbar's controls. Where one is chosen,
 * the group is a radio group and each toggle a radio.
 *
 * **One stop for the keys.** Right and Down move to the next toggle, from the
 * last back to the first, Left and Up to the one before, and Home and End to
 * the ends, passing over a disabled toggle. Where one is chosen, the keys
 * choose where they arrive. Where several can be pressed, they move focus,
 * and a press, Enter, or Space presses. A typed letter moves nothing, as on
 * the web.
 *
 * **The label sits above the row, or in the track** under
 * `label-placement="start"`, with a rule after it. The web draws the rule as
 * the track's `::before`, and a phone as a box of its own.
 */
export default headless('toggle-group', {
  props: {
    allowEmptySelection: false,
    ariaLabel: string(),
    defaultValue: '',
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    labelPlacement: oneOf(['start']),
    /* A form's, which a phone has none of. */
    name: web(''),
    orientation: oneOf(['horizontal', 'vertical']),
    required: false,
    selectionMode: oneOf(['multiple', 'single']),
    value: string(),
    valueMissingMessage: 'Choose one to continue.',
  },
  events: {
    beforeChange: cancelable(['value']),
    /* A toggle's choice, which reaches the group before the group acts on it. */
    beforeSelect: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['invalid', 'settled'],
  collection: {
    allowEmptySelection: 'allowEmptySelection',
    defaultProp: 'defaultValue',
    disabled: 'disabled',
    keys: { loop: true, selectionFollowsFocus: true, typeahead: false },
    onBeforeChange: 'beforeChange',
    onChange: ['input', 'change'],
    optional: true,
    pressMode: 'selectionMode',
    prop: 'value',
  },
  validation: { feedback: 'feedback', required: 'required', valueMissing: 'valueMissingMessage' },
  render: ({ props, state }) => (
    <>
      {!props.labelPlacement && (
        <Wrap
          part="label"
          when={props.label}
        >
          <Slot name="label">
            <Text part="label-text">{props.label}</Text>
          </Slot>
        </Wrap>
      )}
      <View
        label={props.label}
        orientation={props.orientation}
        part="row"
        role={props.selectionMode === 'multiple' ? 'toolbar' : 'radiogroup'}
      >
        <Slot name="start" />
        <View part="track">
          {/* The same label, in the track's line, ahead of the rule. */}
          {props.labelPlacement && (
            <Wrap
              part="label"
              when={props.label}
            >
              <Slot name="label">
                <Text part="label-text">{props.label}</Text>
              </Slot>
            </Wrap>
          )}
          {props.labelPlacement && (
            <View
              ariaHidden
              part="rule"
              platform="native"
            />
          )}
          <View
            ariaHidden
            indicator
            part="indicator"
          />
          <Slot />
        </View>
        <Slot name="end" />
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
