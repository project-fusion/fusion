import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  live,
  pick,
  pressable,
  prop,
  region,
  unless,
  when,
} from '../../../tree.js'

/**
 * A step's headless tier: its mark, its name, a line under the name, and
 * what the stage holds.
 *
 * **A step is an item of its sequence**, `current` while the sequence is on
 * it, and a press on its name goes to it. A disabled step takes no press.
 *
 * **The mark says the stage's state in a shape**: a tick where it is
 * complete, a dot in a ring where the reader is, and an empty ring ahead.
 * It is decorative, so the name says the state in words: a phone says
 * "Current step" after the current stage's name, and `complete-label` after
 * a finished one's, as the web describes the name by it.
 *
 * **The name is a Button on the web**, and its hover, focus, and disabled
 * looks are Button's, through the parts it exports. A phone draws the name
 * as a press of its own, in a ghost button's look.
 *
 * **A finished stage is said once in words** as it becomes complete: in a
 * live region on the web, and on a phone to the reader who pressed.
 *
 * **What a `linear` sequence writes is the web's**: `locked` and `invalid`.
 *
 * **Held to `helix-step`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('step', {
  events: [event('before-select', { cancelable: true, detail: ['value'] })],
  host: { role: 'listitem' },
  item: item('steps', { chooses: true, flag: 'current' }),
  props: [
    prop('complete', 'boolean', { default: false }),
    prop('completed-label', 'string', { default: '{name}, {complete}' }),
    prop('complete-label', 'string', { default: 'Complete' }),
    prop('current', 'boolean', { default: false }),
    prop('disabled', 'boolean', { default: false }),
    prop('optional', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
  ],
  states: ['invalid', 'locked', 'settled'],
  tree: [
    box('marker', { decorative: true }, [
      region('marker', {}, [
        when('complete', box('mark', { decorative: true, glyph: 'check' })),
        unless('complete', when('current', box('mark', { decorative: true, glyph: 'record' }))),
        unless('complete', unless('current', box('mark', { decorative: true, glyph: 'circle' }))),
      ]),
    ]),
    box('body', {}, [
      box('label', {
        draws: 'button',
        exports: { button: true, live: true, spinner: true, text: true },
        platform: 'web',
      }),
      pressable(
        'label',
        {
          chooses: true,
          current: pick('current', { true: 'step' }, ''),
          description: derive('step-said'),
          disabled: bind('disabled'),
          platform: 'native',
          role: 'button',
          sends: 'before-select',
        },
        [region('default')],
      ),
      box('state', { hidden: true }),
      box('description', {}, [region('description')]),
    ]),
    box('content', {}, [region('content')]),
    live('live', { says: bind('complete-label'), while: bind('complete') }),
  ],
})
