import { headless, Slot, Text, View, web } from '../../../render.js'

/**
 * Blockquote's headless tier: a passage set off from the prose around it,
 * and who said it.
 *
 * **A figure holding the passage and its attribution**, as the HTML spec
 * describes one. The attribution sits outside the passage, being about it,
 * and is drawn while it has words: given as `attribution`, or passed into
 * the `attribution` region, which replaces them. A phone announces the
 * figure where the platform has a figure.
 *
 * **What a server cannot see is the web's.** The web element names the
 * figure by its attribution, and drops the role and the name once it sees
 * the attribution is empty, which only the client can see. A phone has no
 * name for a figure from a part of it, so it reads the passage and the
 * attribution in order.
 *
 * **`cite` is the web's**, the address of the source, which the browser
 * keeps and does not show.
 */
export default headless('blockquote', {
  props: {
    attribution: '',
    cite: web(''),
    marks: false,
  },
  events: {},
  states: ['settled'],
  render: ({ props }) => (
    <View
      part="figure"
      role="figure"
    >
      <View
        element="passage"
        part="blockquote"
      >
        <Slot />
      </View>
      <View
        hidden={!props.attribution}
        part="attribution"
      >
        <Slot name="attribution">
          {props.attribution && <Text part="attribution-words">{props.attribution}</Text>}
        </Slot>
      </View>
    </View>
  ),
})
