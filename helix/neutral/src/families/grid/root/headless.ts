import { headless, prop, region } from '../../../tree.js'

/**
 * Grid's element: what it takes and the content it lays out. Grid has no
 * headless tier on the web, so these are `helix-grid`'s own props.
 *
 * **The host is the grid container**, and what is passed in are its cells: a
 * `<slot>` on the web, and on a phone the children the native grid lays out
 * on its tracks.
 *
 * **`min` is a length the web writes into a stylesheet**, so the web element
 * checks it against a grammar first and refuses anything else with a
 * warning: an unchecked one could close the rule and write CSS of its own.
 * A phone reads the same check through the `grid-template` derivation, and
 * draws by `columns` where it fails.
 *
 * **`auto-flow` is the web's.** A phone places each cell in row order, the
 * order `row` and the default give, and has no column flow and no dense
 * packing.
 *
 * **Held to `helix-grid`.** `helix family check` compares the props, the
 * states, and the region with what the manifest says the element has.
 */
export default headless('grid', {
  events: [],
  props: [
    prop('align-items', ['start', 'center', 'end', 'stretch']),
    prop('auto-flow', ['row', 'column', 'dense', 'column-dense'], { platform: 'web' }),
    prop('column-gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    prop('columns', 'number'),
    prop('gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    prop('justify-items', ['start', 'center', 'end', 'stretch']),
    prop('min', 'string', { default: '' }),
    prop('row-gap', ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
  ],
  states: ['settled'],
  tree: [region('default')],
})
