import { bind, box, headless, prop, region, text } from '../../../tree.js'

/**
 * A timeline group's headless tier: a heading over a run of entries, such as
 * a day.
 *
 * **The group is an entry of the timeline, and its entries are a list of
 * their own**, named by the heading's words, so a screen reader hears how
 * many entries each day holds. The heading is content passed into
 * `heading`, or `label` where none is. React Native gives a view no heading
 * level, so a phone announces a heading with none.
 *
 * **Held to `helix-timeline-group`.** `helix family check` compares the
 * props, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('timeline-group', {
  events: [],
  host: { role: 'listitem' },
  props: [prop('heading-level', 'number'), prop('label', 'string', { default: '' })],
  states: ['settled'],
  tree: [
    box('heading', { level: bind('heading-level'), role: 'heading' }, [
      region('heading', {}, [text('heading-text', { says: bind('label') })]),
    ]),
    box('entries', { labelledby: 'heading', role: 'list' }, [region('default')]),
  ],
})
