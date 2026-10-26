import { bare, headless, oneOf, Slot, View, web } from '../../../render.js'
import { scroll } from '../../../tree.js'

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
  props: {
    hideDelay: web(600),
    label: '',
    maxBlockSize: oneOf(['sm', 'md', 'lg', 'xl']),
    orientation: oneOf(['horizontal', 'vertical']),
    scrollbars: web(oneOf(['always', 'auto', 'hover', 'scroll'])),
  },
  events: {
    scroll: bare(),
    scrollend: bare(),
  },
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
  render: ({ props }) => (
    <>
      <View
        label={props.label}
        part="viewport"
        role={props.label === '' ? '' : 'region'}
      >
        <Slot />
      </View>
      <View
        ariaHidden
        part="edges"
      />
      {/* The web's scrollbars, drawn under `scrollbars`. Each is visible while
          it shows, which the web element works out from the pointer and the
          time since the content moved. */}
      {props.scrollbars && (
        <View
          also={{ scrollbar: true, 'scrollbar-visible': true }}
          ariaHidden
          part="scrollbar-vertical"
          platform="web"
        >
          <View
            also={{ thumb: true }}
            part="thumb-vertical"
          />
        </View>
      )}
      {props.scrollbars && (
        <View
          also={{ scrollbar: true, 'scrollbar-visible': true }}
          ariaHidden
          part="scrollbar-horizontal"
          platform="web"
        >
          <View
            also={{ thumb: true }}
            part="thumb-horizontal"
          />
        </View>
      )}
      {props.scrollbars && (
        <View
          ariaHidden
          part="corner"
          platform="web"
        />
      )}
    </>
  ),
})
