import { headless, Slot, View, web } from '../../../render.js'

/**
 * Quote's headless tier: a short quotation, set inline with the words around
 * it.
 *
 * **The platform draws the marks for the language.** The web element draws a
 * real `<q>`, whose marks the browser sets for the element's language and its
 * depth: a quotation inside another takes the inner pair. A phone draws the
 * run of the quotation as a `Text` nested in the words around it, with the
 * marks of its `lang`, then the language of the element around it, then the
 * reader's, and counts the depth the same way.
 *
 * **`cite` is the web's.** The browser keeps the source's address and shows
 * nothing, and a phone has nowhere to keep it.
 */
export default headless('quote', {
  props: {
    cite: web(''),
    noMarks: false,
  },
  events: {},
  states: ['settled'],
  render: () => (
    <View
      element="quotation"
      part="quote"
      run
    >
      <Slot />
    </View>
  ),
})
