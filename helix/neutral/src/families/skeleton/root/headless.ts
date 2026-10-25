import { bind, box, derive, headless, prop, region, repeat, unless, when } from '../../../tree.js'

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
  derived: {
    'line-count': derive('skeleton-lines'),
    paragraph: derive('skeleton-paragraph'),
    'spoken-label': derive('skeleton-name'),
    'spoken-role': derive('skeleton-role'),
    unread: derive('skeleton-unread'),
    wrapping: bind('default'),
  },
  events: [],
  host: {
    busy: bind('loading'),
    decorative: bind('unread'),
    label: bind('spoken-label'),
    role: bind('spoken-role'),
  },
  props: [prop('label', 'string', { default: '' }), prop('loading', 'boolean', { default: false })],
  states: ['settled', 'wrapping'],
  tree: [
    box('content', { inert: bind('loading') }, [region('default')]),
    unless('paragraph', box('skeleton', {}, [box('sheen')])),
    when(
      'paragraph',
      box('lines', {}, [
        repeat('line', { count: bind('line-count') }, [
          box('skeleton', { also: { line: true } }, [box('sheen')]),
        ]),
      ]),
    ),
  ],
})
