import { bind, box, derive, headless, not, prop, region, text } from '../../../tree.js'

/**
 * A menu section's headless tier: a group of the menu's rows under a
 * heading.
 *
 * **The section is a group named by its heading**, its `label` or what is
 * passed into `heading`. Its rows are the menu's own: the arrow keys and
 * the typed letters walk them with the rest, and a run of `exclusive` rows
 * is still the rows next to each other. A section stands on the menu's top
 * page.
 *
 * **Held to `helix-menu-section`.** `helix family check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('menu-section', {
  derived: { named: derive('menu-section-named'), started: derive('menu-section-start') },
  events: [],
  props: [prop('label', 'string', { default: '' })],
  states: ['settled', 'start'],
  tree: [
    box('section', { labelledby: 'heading', role: 'group' }, [
      box('heading', { hidden: not('named'), role: 'presentation' }, [
        region('heading', {}, [text('heading-words', { says: bind('label') })]),
      ]),
      region('default'),
    ]),
  ],
})
