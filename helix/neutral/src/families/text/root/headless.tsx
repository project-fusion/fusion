import { headless, number, oneOf, Slot, View } from '../../../render.js'

/**
 * Text's element: what it takes and its one part. Text has no headless tier
 * on the web, so these are `helix-text`'s own props.
 *
 * **`as` sets the element, and the element sets what a reader hears.** On the
 * web the part is the tag `as` names. A phone announces `h1` to `h6` as a
 * header, with no level, and draws the rest as plain words: it has no
 * element for a paragraph, a `strong`, an `em`, or a `code`.
 *
 * **A run of words on a phone.** The part is a `Text`, so the words and the
 * runs passed into it, such as a `Code` or another `Text`, flow as one
 * paragraph. A text that is `span`, `strong`, `em`, or `code` is drawn as a
 * `Text` nested in the words around it, which wraps with them. A paragraph or
 * a heading is a block of its own.
 *
 * **`lines` ends the words after that many lines**, with an ellipsis: the web
 * writes the line clamp on the part, and a phone gives the run
 * `numberOfLines`. A count that is not a whole number above zero cuts nothing
 * off on either.
 */
export default headless('text', {
  props: {
    as: oneOf(['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'code', 'label']),
    lines: number(),
    textAlign: oneOf(['start', 'center', 'end', 'justify']),
    textWrap: oneOf(['balance', 'pretty', 'nowrap']),
  },
  events: {},
  states: ['settled'],
  render: ({ props }) => (
    <View
      element={props.as}
      lines={props.lines}
      part="text"
      run
    >
      <Slot />
    </View>
  ),
})
