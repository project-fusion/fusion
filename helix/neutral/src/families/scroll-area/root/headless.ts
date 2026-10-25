import { bind, box, event, headless, pick, prop, region, scroll, when } from '../../../tree.js'

/**
 * Scroll Area's headless tier: a box that scrolls and says which of its
 * edges have more past them.
 *
 * **Each edge with more past it is a state**, `more-block-end` while there
 * is more past the bottom, and `scrolls` while the content is longer than
 * the box on an axis it scrolls. The web element measures them, and a phone
 * reads them from where its scroll view stands.
 *
 * **`orientation` keeps the content to one axis**, and the other axis clips
 * what is past it and has no edge that has more.
 *
 * **`max-block-size` is how tall it grows before it scrolls**, from a scale
 * both platforms read, so code shared with a phone can size it with no
 * stylesheet.
 *
 * **It is a region only while it has a name**, since a screen reader says
 * an unnamed region as "region" and nothing more.
 *
 * **The viewport is a stop of keyboard focus while it overflows**, and the
 * arrow keys, Page Up, Page Down, Space, Home, and End scroll it. A phone
 * makes the frame around its scroll view the stop, since a scroll view takes
 * no focus, and draws the focus ring there after a key.
 *
 * **The web's**: the scrollbars drawn under `scrollbars`, and their
 * `hide-delay`, where a phone shows the platform's own scroll indicators.
 *
 * **Held to `helix-scroll-area`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('scroll-area', {
  events: [event('scroll', { bare: true }), event('scrollend', { bare: true })],
  props: [
    prop('hide-delay', 'number', { default: 600, platform: 'web' }),
    prop('label', 'string', { default: '' }),
    prop('max-block-size', ['sm', 'md', 'lg', 'xl']),
    prop('orientation', ['horizontal', 'vertical']),
    prop('scrollbars', ['always', 'auto', 'hover', 'scroll'], { platform: 'web' }),
  ],
  scroll: scroll({
    'block-end': 'more-block-end',
    'block-start': 'more-block-start',
    'inline-end': 'more-inline-end',
    'inline-start': 'more-inline-start',
    moves: 'scroll',
    overflows: 'scrolls',
    part: 'viewport',
    settles: 'scrollend',
  }),
  states: [
    'more-block-end',
    'more-block-start',
    'more-inline-end',
    'more-inline-start',
    'scrollbar-horizontal',
    'scrollbar-vertical',
    'scrolls',
    'settled',
  ],
  tree: [
    box('viewport', { label: bind('label'), role: pick('label', { '': '' }, 'region') }, [
      region('default'),
    ]),
    box('edges', { decorative: true }),
    /* The web's scrollbars, drawn under `scrollbars`. Each is visible while
       it shows, which the web element works out from the pointer and the
       time since the content moved. */
    when(
      'scrollbars',
      box(
        'scrollbar-vertical',
        { also: { scrollbar: true, 'scrollbar-visible': true }, decorative: true, platform: 'web' },
        [box('thumb-vertical', { also: { thumb: true } })],
      ),
    ),
    when(
      'scrollbars',
      box(
        'scrollbar-horizontal',
        { also: { scrollbar: true, 'scrollbar-visible': true }, decorative: true, platform: 'web' },
        [box('thumb-horizontal', { also: { thumb: true } })],
      ),
    ),
    when('scrollbars', box('corner', { decorative: true, platform: 'web' })),
  ],
})
