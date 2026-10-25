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
 * Radio Group's headless tier: the question, the radios that answer it, and
 * the line under them.
 *
 * **The group is the form control, and the radios are its choices.** It
 * holds the answer in `value`, seeded by `default-value`. A radio's `select`
 * reaches the group, then the group asks with `before-change`, and once the
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
  collection: collection({
    after: ['input', 'change'],
    before: 'before-change',
    chosen: 'value',
    disabled: 'disabled',
    initial: 'default-value',
    keys: { chooses: true, letters: false, wrap: true },
    optional: true,
    readonly: 'readonly',
  }),
  events: [
    event('before-change', { cancelable: true, detail: ['value'] }),
    event('change', { bare: true }),
    event('input', { bare: true }),
    /* A radio's choice, which reaches the group before the group acts on it. */
    event('select', { cancelable: true, detail: ['value'] }),
  ],
  props: [
    prop('aria-label', 'string'),
    prop('default-value', 'string', { default: '' }),
    prop('disabled', 'boolean', { default: false }),
    prop('feedback', 'string', { default: '' }),
    prop('hint', 'string', { default: '' }),
    prop('label', 'string', { default: '' }),
    prop('orientation', ['horizontal', 'vertical']),
    prop('readonly', 'boolean', { default: false }),
    prop('required', 'boolean', { default: false }),
    prop('value', 'string'),
    prop('value-missing-message', 'string', { default: 'Choose one to continue.' }),
    /* A form's, which a phone has none of. */
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['invalid', 'settled'],
  tree: [
    wrap('label', { while: bind('label') }, [
      region('label', {}, [text('label-text', { says: bind('label') })]),
    ]),
    box('items', { label: bind('label'), orientation: bind('orientation'), role: 'radiogroup' }, [
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
