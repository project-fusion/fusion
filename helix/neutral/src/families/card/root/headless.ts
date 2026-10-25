import { bind, headless, prop, region, wrap } from '../../../tree.js'

/**
 * Card's headless tier: what it takes and its regions.
 *
 * **Each region is a part**, in order: the media, the header and its
 * actions, the body, and the footer and its actions. A region draws no box
 * of its own, so a card without a region lays out as one without it.
 *
 * **A header or a footer with actions is a line of its own**, `header-row`
 * or `footer-row`, drawn only while its actions region holds something: the
 * header or the footer takes the room and the actions keep their width.
 *
 * **A card with a `label` is a group named by it**, through the host, where
 * the web element sets the role and the name through `ElementInternals`. A
 * phone names the group with the label's words, and gives a card with no
 * label no role. On the web, an `aria-label` or an `aria-labelledby` on the
 * host names the card too, and an unnamed card is named by a heading in its
 * header. The `has-media`, `has-header` and `has-footer` states are the
 * web's: a phone's styles read whether a region holds something from its
 * prop.
 *
 * **Held to `helix-card`.** `helix family check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('card', {
  events: [],
  host: { label: bind('label'), role: 'group' },
  props: [prop('label', 'string', { default: '' }), prop('media-placement', ['end'])],
  states: ['has-footer', 'has-header', 'has-media', 'settled'],
  tree: [
    region('media', { part: 'media' }),
    wrap('header-row', { while: bind('header-actions') }, [
      region('header', { part: 'header' }),
      region('header-actions', { part: 'header-actions' }),
    ]),
    region('default', { part: 'body' }),
    wrap('footer-row', { while: bind('footer-actions') }, [
      region('footer', { part: 'footer' }),
      region('footer-actions', { part: 'footer-actions' }),
    ]),
  ],
})
