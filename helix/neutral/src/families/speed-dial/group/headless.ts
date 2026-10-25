import { bind, box, derive, headless, not, prop, region, text } from '../../../tree.js'

/**
 * A speed dial group's headless tier: a set of actions under a name.
 *
 * **The group is named by its `label`**, or by what is passed into
 * `label`, drawn above its actions, and a group with no name draws none.
 * Its actions are the dial's own: the arrow keys walk them with the rest,
 * and choosing one closes the dial.
 *
 * **Held to `helix-speed-dial-group`.** `helix family check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('speed-dial-group', {
  derived: { named: derive('speed-dial-group-named') },
  events: [],
  props: [prop('label', 'string', { default: '' })],
  states: ['settled'],
  tree: [
    box('group', { labelledby: 'label', role: 'group' }, [
      box('label', { hidden: not('named') }, [
        region('label', {}, [text('label-words', { says: bind('label') })]),
      ]),
      region('default'),
    ]),
  ],
})
