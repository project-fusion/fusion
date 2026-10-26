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
import { collection, validation } from '../../../tree.js'

/**
 * Checkbox Group's headless tier: a name for a set of checkboxes, the boxes,
 * and the line under them.
 *
 * **Each box turns on its own, and the group holds the set.** `value` is the
 * values of the boxes that are checked, separated by commas, in the order the
 * boxes stand. A box's `before-check` asks first, then the group asks with
 * `before-change`, carrying the whole set that would result, and a refusal by
 * either keeps the box as it was. Once the set has moved, the group sends
 * `input` and `change`, and then the box sends its own. Writing `value`
 * checks exactly the boxes whose values it names.
 *
 * **Each box is a stop of its own**, as a set of native checkboxes is, and
 * Space turns the box with focus.
 *
 * **`select-all` draws a checkbox above the set** that checks every enabled
 * box, or unchecks them all once every one is, through the same
 * `before-change`. It shows a dash while only some are checked, and a
 * disabled box keeps its state.
 *
 * **A required group with nothing checked** shows its message once the
 * reader has had a go at it, or asked for the verdict, as a checkbox does. A
 * disabled group disables every box.
 */
export default headless('checkbox-group', {
  props: {
    ariaLabel: string(),
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    /* A form's, which a phone has none of. */
    name: web(''),
    orientation: oneOf(['horizontal']),
    required: false,
    selectAll: false,
    selectAllLabel: 'Select all',
    value: string(),
    valueMissingMessage: 'Choose at least one to continue.',
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['invalid', 'settled'],
  collection: collection({
    after: ['input', 'change'],
    all: { enabled: 'select-all', label: 'select-all-label', part: 'select-all' },
    before: 'before-change',
    chosen: 'value',
    disabled: 'disabled',
    toggles: true,
  }),
  validation: validation({
    feedback: 'feedback',
    missing: 'value-missing-message',
    required: 'required',
  }),
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
      {props.selectAll && (
        <View
          draws="checkbox"
          exports={{
            box: true,
            control: true,
            feedback: true,
            field: true,
            hint: true,
            label: true,
            mark: true,
            'mark-checked': true,
            'mark-dash': true,
            'mark-indeterminate': true,
          }}
          part="select-all"
        />
      )}
      <View
        label={props.label}
        orientation={props.orientation}
        part="items"
        role="group"
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
