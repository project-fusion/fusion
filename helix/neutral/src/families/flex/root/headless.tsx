import { headless, oneOf, Slot } from '../../../render.js'

/**
 * Flex's element: what it takes and the content it lays out. Flex has no
 * headless tier on the web, so these are `helix-flex`'s own props.
 *
 * **The host is the flex container**, and what is passed in are its items: a
 * `<slot>` on the web, and the children of a flex view on a phone. No part
 * draws a box of its own.
 *
 * **`wrap` is a switch with one named value**: absent is `false`, present is
 * `true`, and `wrap="reverse"` wraps each new line above the one before.
 *
 * **Held to `helix-flex`.** `helix family check` compares the props, the
 * states, and the region with what the manifest says the element has.
 */
export default headless('flex', {
  props: {
    alignContent: oneOf(['start', 'center', 'end', 'between', 'around', 'stretch']),
    alignItems: oneOf(['start', 'center', 'end', 'stretch', 'baseline']),
    columnGap: oneOf(['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    direction: oneOf(['row', 'column', 'row-reverse', 'column-reverse']),
    gap: oneOf(['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    inline: false,
    justifyContent: oneOf(['start', 'center', 'end', 'between', 'around']),
    layout: oneOf(['cluster', 'flank', 'flank-end', 'split', 'switch']),
    rowGap: oneOf(['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    wrap: oneOf([true, 'reverse'], false),
  },
  events: {},
  states: ['settled'],
  render: () => <Slot />,
})
