import { headless, prop, region } from '../../../tree.js'

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
  events: [],
  props: [
    prop('align-content', ['start', 'center', 'end', 'between', 'around', 'stretch']),
    prop('align-items', ['start', 'center', 'end', 'stretch', 'baseline']),
    prop('column-gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    prop('direction', ['row', 'column', 'row-reverse', 'column-reverse']),
    prop('gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    prop('inline', 'boolean', { default: false }),
    prop('justify-content', ['start', 'center', 'end', 'between', 'around']),
    prop('layout', ['cluster', 'flank', 'flank-end', 'split', 'switch']),
    prop('row-gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    prop('wrap', [true, 'reverse'], { default: false }),
  ],
  states: ['settled'],
  tree: [region('default')],
})
