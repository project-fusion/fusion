import { bind, box, event, headless, item, pressable, prop, region } from '../../../tree.js'

/**
 * Radio's headless tier: one choice of a radio group.
 *
 * **The group holds the answer.** A press on the radio sends `select`, which
 * its consumer and then the group's may refuse, and the group chooses it,
 * which the radio reads as `selected`. A screen reader hears a radio,
 * checked while it is chosen. The arrow keys move among the radios of a
 * group, and the radio has no label, hint, or message of its own: those are
 * the group's.
 *
 * **The dot is the circle's to draw**: the styled tier draws it after the
 * circle, and an icon passed into `indicator` takes its place.
 */
export default headless('radio', {
  events: [event('select', { cancelable: true, detail: ['value'] })],
  item: item('radio-group', { chooses: true }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('selected', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
  ],
  states: ['has-indicator', 'selected', 'settled'],
  tree: [
    pressable(
      'item',
      {
        checked: bind('selected'),
        chooses: true,
        disabled: bind('disabled'),
        role: 'radio',
        sends: 'select',
      },
      [
        box('box', { decorative: true }, [region('indicator')]),
        region('icon'),
        box('label', {}, [region('default')]),
      ],
    ),
  ],
})
