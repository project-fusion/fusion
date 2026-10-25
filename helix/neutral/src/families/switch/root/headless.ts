import {
  bind,
  box,
  event,
  headless,
  not,
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
  events: [
    event('before-toggle', { cancelable: true, detail: ['checked'] }),
    event('change', { bare: true }),
    event('input', { bare: true }),
  ],
  props: [
    prop('aria-label', 'string'),
    prop('checked', 'boolean'),
    prop('default-checked', 'boolean', { default: false }),
    prop('disabled', 'boolean', { default: false }),
    prop('feedback', 'string', { default: '' }),
    prop('hint', 'string', { default: '' }),
    prop('label', 'string', { default: '' }),
    prop('readonly', 'boolean', { default: false }),
    prop('required', 'boolean', { default: false }),
    prop('value', 'string', { default: 'on' }),
    prop('value-missing-message', 'string', { default: 'Turn this on to continue.' }),
    /* A form's, which a phone has none of. */
    prop('name', 'string', { default: '', platform: 'web' }),
  ],
  states: ['checked', 'invalid', 'settled'],
  toggle: toggle({
    after: ['input', 'change'],
    before: 'before-toggle',
    checked: 'checked',
    initial: 'default-checked',
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
        role: 'switch',
        toggles: true,
      },
      [
        box('track', {}, [
          pressable('control', { checked: bind('checked'), platform: 'web', role: 'switch' }, []),
          box('thumb', { decorative: true }, [
            region('on', { hidden: not('checked') }),
            region('off', { hidden: bind('checked') }),
          ]),
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
