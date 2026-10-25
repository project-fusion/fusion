import { bind, box, headless, prop, region, text, when } from '../../../tree.js'

/**
 * A timeline's headless tier: a list of events, in the order they happened.
 *
 * **The host is the list**, named by `label`, and each entry and each group
 * of entries is an item of it. A timeline records what happened or is
 * scheduled: no entry is current or complete, which is `Steps`' job.
 *
 * **A feed that loads more sets `loading`.** The timeline is busy, and an
 * entry after the last says so: `loading-label`, or content passed into
 * `loading`.
 *
 * **Held to `helix-timeline`.** `helix family check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('timeline', {
  events: [],
  host: { busy: bind('loading'), label: bind('label'), role: 'list' },
  props: [
    prop('label', 'string', { default: '' }),
    prop('loading', 'boolean', { default: false }),
    prop('loading-label', 'string', { default: 'Loading more' }),
  ],
  states: ['loading', 'settled'],
  tree: [
    region('default'),
    when(
      'loading',
      box('loading', { role: 'listitem' }, [
        region('loading', {}, [text('loading-text', { says: bind('loading-label') })]),
      ]),
    ),
  ],
})
