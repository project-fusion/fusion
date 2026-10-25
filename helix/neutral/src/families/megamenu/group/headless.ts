import { bind, box, derive, headless, not, prop, region, text } from '../../../tree.js'

/**
 * A megamenu group's headless tier: a column of a megamenu's panel, a
 * heading and the destinations under it.
 *
 * **The group is named by its heading**, its `label` or what is passed into
 * `label`, such as a product's mark and its name. The heading is a heading
 * of level 3, which a phone announces as a heading with no level, and a
 * group with no name draws none. Its destinations are the megamenu's own.
 *
 * **Held to `helix-megamenu-group`.** `helix family check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('megamenu-group', {
  derived: { named: derive('megamenu-group-named') },
  events: [],
  props: [prop('label', 'string', { default: '' })],
  states: ['settled'],
  tree: [
    box('group', { labelledby: 'label', role: 'group' }, [
      box('label', { hidden: not('named'), level: 3, role: 'heading' }, [
        region('label', {}, [text('label-words', { says: bind('label') })]),
      ]),
      region('default'),
    ]),
  ],
})
