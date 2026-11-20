import { headless, Repeat, Slot, View } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Skeleton's headless tier: a placeholder shape, or the box around content
 * that is still loading.
 *
 * **A skeleton around content is the content's size.** It is `wrapping`
 * while its default region holds something that is not all space, the test
 * the web element runs on its children: the content keeps its place, is
 * inert while `loading`, and the shape lies over it until `loading` goes.
 *
 * **A labeled skeleton is a busy indicator with a name**, a progress bar a
 * screen reader hears, while it is a placeholder or the content it holds is
 * loading. Loaded content is the page's own and is read as it is, and a
 * placeholder with no name is hidden. The host is busy while `loading`.
 *
 * **A paragraph is its lines.** With `shape="text"` and two or more `lines`,
 * which the styled tier takes, the shape is a column of lines, each a
 * `skeleton` part that is a `line` as well. Each shape carries the `sheen`
 * that sweeps across it.
 *
 * **A placeholder the page draws** goes in `placeholder`, in place of the
 * shape, in the `placeholder` part that holds either.
 *
 * **The web's**: `revealing`, while turning `loading` off crossfades the
 * placeholder into the content in one place and moves the box's height
 * from one to the other, and the content hidden while a placeholder the
 * page drew stands in for it. A phone shows the content at once.
 */
export default headless('skeleton', {
  props: {
    label: '',
    loading: false,
  },
  events: {},
  states: ['revealing', 'settled', 'wrapping', 'wrappingBlock'],
  derived: {
    lineCount: derive('skeleton-lines'),
    paragraph: derive('skeleton-paragraph'),
    spokenLabel: derive('skeleton-name'),
    spokenRole: derive('skeleton-role'),
    unread: derive('skeleton-unread'),
    wrapping: bind('default'),
  },
  host: {
    busy: bind('loading'),
    ariaHidden: bind('unread'),
    label: bind('spokenLabel'),
    role: bind('spokenRole'),
  },
  render: ({ derived, props }) => (
    <>
      <View
        inert={props.loading}
        part="content"
      >
        <Slot />
      </View>
      {/* The shape is the `placeholder` slot's fallback, so a placeholder the
          page draws replaces it, in a box hidden from a screen reader. */}
      <View
        ariaHidden
        part="placeholder"
      >
        <Slot name="placeholder">
          {!derived.paragraph ? (
            <View part="skeleton">
              <View part="sheen" />
            </View>
          ) : (
            <View part="lines">
              <Repeat
                count={derived.lineCount}
                part="line"
              >
                <View
                  also={{ line: true }}
                  part="skeleton"
                >
                  <View part="sheen" />
                </View>
              </Repeat>
            </View>
          )}
        </Slot>
      </View>
      {/* Over a wrapped field, a shape for each of its pieces, which the web's
          element measures. */}
      <View
        part="pieces"
        platform="web"
      >
        <View
          also={{ piece: true }}
          part="skeleton"
        >
          <View part="sheen" />
        </View>
      </View>
    </>
  ),
})
