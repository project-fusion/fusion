import { collection, headless, prop, region } from '../../../tree.js'

/**
 * An accordion's headless tier: a set of sections that open and close.
 *
 * **The set holds its sections to its `mode`.** With none, any number stand
 * open. Under `single-collapsible`, a section that opens asks each other open
 * section to close, with its own `before-close`, which may refuse. Under
 * `single`, the same, and a press on the open section keeps it open and
 * sends nothing. The set settles on the first open section as it draws, and
 * on the first section under `single` where none is open.
 *
 * **The arrow keys move between the triggers**, Up and Down, Left and
 * Right, coming round at the ends, and Home and End go to the first and the
 * last, passing over a disabled section. On a phone they are a hardware
 * keyboard's. Each trigger stays a stop of its own.
 *
 * **The web's**: find in page, which opens a closed section where it finds a
 * match, and `hidden-until-found`.
 *
 * **Held to `helix-accordion`.** `helix family check` compares the props,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('accordion', {
  collection: collection({ opens: 'mode', toggles: true }),
  events: [],
  props: [
    prop('heading-level', 'number'),
    prop('mode', ['single', 'single-collapsible']),
    /* Find in page, which a phone has none of. */
    prop('hidden-until-found', 'boolean', { default: true, platform: 'web' }),
  ],
  states: ['settled'],
  tree: [region('default')],
})
