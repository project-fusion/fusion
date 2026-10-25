import { bind, box, headless, live, not, prop, region, text, when } from '../../../tree.js'

/**
 * Empty's headless tier: what it takes and its regions.
 *
 * **Each region is a part**, drawn in order: the icon, the heading, the
 * message, and the actions. A `heading` given as words is drawn as a heading
 * of `heading-level`, which the heading region falls back to. A phone
 * announces a heading with no level.
 *
 * **An empty view says its heading as it arrives.** The web element says
 * the heading and the message once when it appears after the page has
 * loaded, and holds them out of the tree while its live copy says them. A
 * phone says the heading as the view is drawn, and again each time it is
 * drawn anew, through the announce capability, unless `no-announce` holds,
 * and its words are read where they are as well. Wrapping a slotted element
 * that is no heading in the heading part reads the element's kind, which is
 * the web's.
 *
 * **Held to `helix-empty`.** `helix family check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('empty', {
  events: [],
  props: [
    prop('heading', 'string', { default: '' }),
    prop('heading-level', 'number'),
    prop('no-announce', 'boolean', { default: false }),
  ],
  states: ['has-actions', 'has-icon', 'settled'],
  tree: [
    region('icon', { part: 'icon' }),
    region('heading', {}, [
      when(
        'heading',
        box('heading', { level: bind('heading-level'), role: 'heading' }, [
          text('heading-words', { says: bind('heading') }),
        ]),
      ),
    ]),
    region('default', { part: 'message' }),
    region('actions', { part: 'actions' }),
    live('live', { platform: 'web' }),
    live('arrival', {
      arrives: true,
      platform: 'native',
      says: bind('heading'),
      while: not('no-announce'),
    }),
  ],
})
