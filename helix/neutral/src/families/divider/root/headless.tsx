import { headless, oneOf, Slot, View, web } from '../../../render.js'

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
 * **Held to `helix-divider`.** `helix system check` compares the props, the
 * states, the region, and the parts with what the manifest says the element
 * has.
 */
export default headless('divider', {
  props: {
    announced: web(false),
    decorative: false,
    orientation: oneOf(['horizontal', 'vertical']),
  },
  events: {},
  states: ['settled', 'vertical'],
  render: ({ props, slots }) => (
    <>
      <View
        ariaHidden={props.decorative}
        orientation={props.orientation}
        part="line"
        role="separator"
      />
      <View
        hidden={!slots.default}
        part="content"
      >
        <Slot />
      </View>
      <View
        part="line"
        role="presentation"
      />
    </>
  ),
})
