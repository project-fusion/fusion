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
 */
export default headless('skeleton', {
  props: {
    label: '',
    loading: false,
  },
  events: {},
  states: ['settled', 'wrapping'],
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
    decorative: bind('unread'),
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
    </>
  ),
})
