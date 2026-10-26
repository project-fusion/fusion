import {
  bind,
  box,
  collection,
  event,
  headless,
  pick,
  prop,
  region,
  text,
  unless,
  validation,
  when,
  wrap,
} from '../../../tree.js'

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
  collection: collection({
    after: ['input', 'change'],
    before: 'before-change',
    chosen: 'value',
    clears: 'allow-empty-selection',
    disabled: 'disabled',
    initial: 'default-value',
    keys: { chooses: true, letters: false, wrap: true },
    optional: true,
    presses: 'selection-mode',
  }),
  events: [
    event('before-change', { cancelable: true, detail: ['value'] }),
    event('change', { bare: true }),
    event('input', { bare: true }),
    /* A toggle's choice, which reaches the group before the group acts on it. */
    event('before-select', { cancelable: true, detail: ['value'] }),
  ],
  props: [
    prop('allow-empty-selection', 'boolean', { default: false }),
    prop('aria-label', 'string'),
    prop('default-value', 'string', { default: '' }),
    prop('disabled', 'boolean', { default: false }),
    prop('feedback', 'string', { default: '' }),
    prop('hint', 'string', { default: '' }),
    prop('label', 'string', { default: '' }),
    prop('label-placement', ['start']),
    prop('orientation', ['horizontal', 'vertical']),
    prop('required', 'boolean', { default: false }),
    prop('selection-mode', ['multiple', 'single']),
    prop('value', 'string'),
    prop('value-missing-message', 'string', { default: 'Choose one to continue.' }),
    /* A form's, which a phone has none of. */
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['invalid', 'settled'],
  tree: [
    unless(
      'label-placement',
      wrap('label', { while: bind('label') }, [
        region('label', {}, [text('label-text', { says: bind('label') })]),
      ]),
    ),
    box(
      'row',
      {
        label: bind('label'),
        orientation: bind('orientation'),
        role: pick('selection-mode', { multiple: 'toolbar' }, 'radiogroup'),
      },
      [
        region('start'),
        box('track', {}, [
          /* The same label, in the track's line, ahead of the rule. */
          when(
            'label-placement',
            wrap('label', { while: bind('label') }, [
              region('label', {}, [text('label-text', { says: bind('label') })]),
            ]),
          ),
          when('label-placement', box('rule', { decorative: true, platform: 'native' })),
          box('indicator', { decorative: true, marks: 'chosen' }),
          region('default'),
        ]),
        region('end'),
      ],
    ),
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
