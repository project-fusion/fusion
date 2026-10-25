import { box, headless, region } from '../../../tree.js'

/**
 * Code's headless tier: one run of code in a line of prose.
 *
 * **A `<code>` on the web, and a run of words on a phone.** The web element
 * draws a real `<code>`, which marks the words as code for a translator and a
 * search. A phone has no element for code, so it draws the run as a `Text`
 * nested in the words around it, which wraps with them.
 *
 * **`translate="no"` is the web's.** A page translator reads it, and a phone
 * translates nothing.
 */
export default headless('code', {
  events: [],
  props: [],
  states: ['settled'],
  tree: [box('code', { element: 'code', run: true, translate: 'no' }, [region('default')])],
})
