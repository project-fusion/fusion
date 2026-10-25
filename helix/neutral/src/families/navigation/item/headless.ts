import { bind, event, headless, item, pressable, prop, region } from '../../../tree.js'

/**
 * A navigation item's headless tier: one destination, a link that says
 * whether it is current.
 *
 * **The item is a link to its `href`**, which sends `select` with the
 * `href` as its value and opens unless the event was refused: on the web
 * the browser follows it, and on a phone the app's open-link, its router
 * where it set one. An item with no `href` draws its words as a box.
 *
 * **`current` says the item is the one the reader is on**, with
 * `aria-current`'s values, and the page writes it: the navigation's mark
 * stands at it. A phone says "Current page", or the words for its value,
 * after the item's words, since React Native has no state for it.
 *
 * **The item stands for its `href` in its navigation**, so two items with
 * one `href` are one destination to a phone's keys.
 *
 * **Held to `helix-navigation-item`.** `helix family check` compares the
 * props, the event, the states, the region, and the part with what the
 * manifest says the element has.
 */
export default headless('navigation-item', {
  events: [event('select', { cancelable: true, detail: ['value'] })],
  item: item('navigation', { chooses: true, flag: 'current', value: 'href' }),
  props: [
    prop('current', ['date', 'location', 'page', 'step', 'time', 'true']),
    prop('href', 'string', { default: '' }),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
  ],
  states: ['settled'],
  tree: [
    pressable(
      'link',
      { chooses: true, current: bind('current'), href: bind('href'), sends: 'select' },
      [region('default')],
    ),
  ],
})
