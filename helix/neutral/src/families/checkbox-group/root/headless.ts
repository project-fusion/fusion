import {
  bind,
  box,
  collection,
  event,
  headless,
  prop,
  region,
  text,
  unless,
  validation,
  when,
  wrap,
} from '../../../tree.js'

/**
 * Checkbox Group's headless tier: a name for a set of checkboxes, the boxes,
 * and the line under them.
 *
 * **Each box turns on its own, and the group holds the set.** `value` is the
 * values of the boxes that are checked, separated by commas, in the order the
 * boxes stand. A box's `before-toggle` asks first, then the group asks with
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
  collection: collection({
    after: ['input', 'change'],
    all: { enabled: 'select-all', label: 'select-all-label', part: 'select-all' },
    before: 'before-change',
    chosen: 'value',
    disabled: 'disabled',
    toggles: true,
  }),
  events: [
    event('before-change', { cancelable: true, detail: ['value'] }),
    event('change', { bare: true }),
    event('input', { bare: true }),
  ],
  props: [
    prop('aria-label', 'string'),
    prop('disabled', 'boolean', { default: false }),
    prop('feedback', 'string', { default: '' }),
    prop('hint', 'string', { default: '' }),
    prop('label', 'string', { default: '' }),
    prop('orientation', ['horizontal']),
    prop('required', 'boolean', { default: false }),
    prop('select-all', 'boolean', { default: false }),
    prop('select-all-label', 'string', { default: 'Select all' }),
    prop('value', 'string'),
    prop('value-missing-message', 'string', { default: 'Choose at least one to continue.' }),
    /* A form's, which a phone has none of. */
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['invalid', 'settled'],
  tree: [
    wrap('label', { while: bind('label') }, [
      region('label', {}, [text('label-text', { says: bind('label') })]),
    ]),
    when(
      'select-all',
      box('select-all', {
        draws: 'checkbox',
        exports: {
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
        },
      }),
    ),
    box('items', { label: bind('label'), orientation: bind('orientation'), role: 'group' }, [
      region('default'),
    ]),
    unless(
      'invalid',
      wrap('hint', { while: bind('hint') }, [
        region('hint', {}, [text('hint-text', { says: bind('hint') })]),
      ]),
    ),
    when(
      'invalid',
      box('feedback', { role: 'alert' }, [
        region('feedback', {}, [text('feedback-text', { says: bind('value-missing-message') })]),
      ]),
    ),
  ],
  validation: validation({
    feedback: 'feedback',
    missing: 'value-missing-message',
    required: 'required',
  }),
})
