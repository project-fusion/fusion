import { bind, box, headless, not, prop, region } from '../../../tree.js'

/**
 * Divider's headless tier: what it takes, and a line, what is set into it,
 * and a line.
 *
 * **Two lines and the content between them, always.** A divider with nothing
 * set into it is one line: the content is hidden, and the two halves meet.
 * The first line carries the semantics, and the second is drawn only.
 *
 * **The line is a separator unless `decorative`**, as `<hr>` is. On the web
 * it is named by the words set into it, which are read once, as that name. A
 * phone announces no separator's name, so there the words are read where
 * they are and the line is a separator with no name.
 *
 * **It runs across a toolbar it sits in** where `orientation` is not set:
 * the `vertical` state holds inside a horizontal toolbar, as core's
 * `toolbarAround` finds one on the web and the toolbar around it says on a
 * phone.
 *
 * **`announced` is the web's.** It is deprecated there, and a phone never
 * had it.
 *
 * **Held to `helix-divider`.** `helix family check` compares the props, the
 * states, the region, and the parts with what the manifest says the element
 * has.
 */
export default headless('divider', {
  events: [],
  props: [
    prop('announced', 'boolean', { default: false, platform: 'web' }),
    prop('decorative', 'boolean', { default: false }),
    prop('orientation', ['horizontal', 'vertical']),
  ],
  states: ['settled', 'vertical'],
  tree: [
    box('line', {
      decorative: bind('decorative'),
      orientation: bind('orientation'),
      role: 'separator',
    }),
    box('content', { hidden: not('default') }, [region('default')]),
    box('line', { role: 'presentation' }),
  ],
})
