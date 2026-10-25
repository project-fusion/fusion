import {
  bind,
  box,
  event,
  headless,
  item,
  pressable,
  prop,
  region,
  text,
  toggle,
  unless,
  validation,
  when,
  wrap,
} from '../../../tree.js'

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
 * its own. Its turn asks the group once its own `before-toggle` stands, and
 * the group's disabled disables it.
 */
export default headless('checkbox', {
  events: [
    event('before-toggle', { cancelable: true, detail: ['checked'] }),
    event('change', { bare: true }),
    event('input', { bare: true }),
  ],
  item: item('checkbox-group'),
  props: [
    prop('aria-label', 'string'),
    prop('checked', 'boolean'),
    prop('default-checked', 'boolean', { default: false }),
    prop('disabled', 'boolean', { default: false }),
    prop('feedback', 'string', { default: '' }),
    prop('hint', 'string', { default: '' }),
    prop('indeterminate', 'boolean', { default: false }),
    prop('label', 'string', { default: '' }),
    prop('readonly', 'boolean', { default: false }),
    prop('required', 'boolean', { default: false }),
    prop('value', 'string', { default: 'on' }),
    prop('value-missing-message', 'string', { default: 'Tick this box to continue.' }),
    /* A form's, which a phone has none of. */
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['checked', 'has-check', 'has-dash', 'has-label', 'indeterminate', 'invalid', 'settled'],
  toggle: toggle({
    after: ['input', 'change'],
    before: 'before-toggle',
    checked: 'checked',
    initial: 'default-checked',
    mixed: 'indeterminate',
    readonly: 'readonly',
  }),
  tree: [
    pressable(
      'field',
      {
        disabled: bind('disabled'),
        keys: 'space',
        label: bind('aria-label'),
        readonly: bind('readonly'),
        required: bind('required'),
        role: 'checkbox',
        toggles: true,
      },
      [
        box('box', {}, [
          box('control'),
          box(
            'mark',
            {
              also: {
                'mark-checked': bind('checked'),
                'mark-dash': bind('indeterminate'),
                'mark-indeterminate': bind('indeterminate'),
              },
              decorative: true,
            },
            [
              unless(
                'indeterminate',
                region('check', {}, [
                  box('tick', { platform: 'native', viewBox: '0 0 24 24' }, [
                    box('tick-line', { d: 'M6 12.5 10.2 16.7 18 8.4', shape: 'path' }),
                  ]),
                ]),
              ),
              when(
                'indeterminate',
                region('dash', {}, [
                  box('dash-mark', { platform: 'native', viewBox: '0 0 24 24' }, [
                    box('dash-line', { d: 'M7 12h10', shape: 'path' }),
                  ]),
                ]),
              ),
            ],
          ),
        ]),
        box('label', {}, [region('default', {}, [text('label-text', { says: bind('label') })])]),
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
