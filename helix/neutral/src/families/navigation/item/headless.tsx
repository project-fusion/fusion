import { cancelable, headless, oneOf, Pressable, Slot, set, web } from '../../../render.js'

/**
 * A navigation item's headless tier: one destination, a link that says
 * whether it is current.
 *
 * **The item is a link to its `href`**, which asks with `before-select`,
 * the `href` as its value, says `select` once it stands, and opens unless
 * the request was refused: on the web
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
 * **Held to `helix-navigation-item`.** `helix system check` compares the
 * props, the event, the states, the region, and the part with what the
 * manifest says the element has.
 */
export default headless('navigation-item', {
  memberOf: set('navigation', { current: 'current', value: 'href' }),
  props: {
    current: oneOf(['date', 'location', 'page', 'step', 'time', 'true']),
    href: '',
    rel: web(''),
    target: web(''),
  },
  events: {
    beforeSelect: cancelable(['value']),
    select: ['value'],
  },
  states: ['settled'],
  render: ({ props, send }) => (
    <Pressable
      current={props.current}
      href={props.href}
      onPress={send.beforeSelect}
      part="link"
      selects
    >
      <Slot />
    </Pressable>
  ),
})
