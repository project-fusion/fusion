import { Announce, cancelable, headless, Pressable, Slot, Text, View } from '../../../render.js'
import { bind, collection, derive, stack } from '../../../tree.js'

/**
 * Drilldown's headless tier: a stack of pages of rows, one page showing at
 * a time, where a row with a page of its own shows that page in place of
 * the one showing.
 *
 * **A press on a row with a page goes into it**, and the arrow along the
 * line does too. The way back in the header over the page, the arrow back,
 * and Escape go up one level. Each move asks `before-navigate` first, with
 * the `value` of the row whose page would show, empty for the top page,
 * which a handler may refuse, and says `navigate` once the page shows. `page` holds the value of the row whose page is
 * showing, and writing it shows that page.
 *
 * **Focus moves with the page**: to its first row going in, and to the row
 * whose page was left going back. The arrow keys move among the rows, Home
 * and End go to the first and the last, and a typed letter moves to the
 * next row whose name starts with it. A press on a row with no page sends
 * its `before-select` and `select`, which reach the drilldown's handler too.
 *
 * **The page slides in from the side it came from**: the element is
 * `forward` after a move into a page and `back` after a move out of one,
 * and `drilled` while a page below the top is showing. The header names the
 * page showing, which the page is named by, and the top page is named by
 * `label`.
 *
 * **Under `navigation` the host is a navigation landmark** named by
 * `label`, each page is a list, and each row a list item. While `loading` holds, the page says
 * `loading-text`, and with no rows it says `empty-text`, each told to a
 * screen reader too.
 *
 * **Held to `helix-drilldown`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('drilldown', {
  props: {
    backLabel: 'Back',
    emptyText: 'Nothing to show',
    fallbackLabel: 'Navigation',
    label: '',
    loading: false,
    loadingText: 'Loading',
    navigation: false,
    page: '',
  },
  events: {
    beforeNavigate: cancelable(['value']),
    beforeSelect: cancelable(['value']),
    navigate: ['value'],
    select: ['value'],
  },
  states: ['back', 'drilled', 'forward', 'settled'],
  derived: {
    backName: derive('drilldown-back-name'),
    emptyWords: derive('drilldown-empty'),
    landmark: derive('drilldown-landmark'),
    landmarkName: derive('drilldown-landmark-name'),
    loadingWords: derive('drilldown-loading'),
    pageRole: derive('drilldown-page-role'),
    rows: bind('default'),
    status: derive('drilldown-status'),
    topName: derive('drilldown-top-name'),
  },
  collection: collection({
    keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: true },
    mixes: true,
  }),
  host: { label: bind('landmark-name'), role: bind('landmark') },
  stack: stack({
    back: 'back',
    before: 'before-navigate',
    drilled: 'drilled',
    entered: 'forward',
    label: 'page-label',
    left: 'back',
    page: 'page',
    top: 'top-name',
    writes: { listed: 'navigation' },
  }),
  render: ({ derived, props, stack, state }) => (
    <>
      {state.drilled && (
        <View part="header">
          <Pressable
            label={derived.backName}
            part="back"
          >
            <Slot
              ariaHidden
              name="back-icon"
            >
              <View
                ariaHidden
                icon="caret-left"
                part="back-mark"
              />
            </Slot>
          </Pressable>
          <View part="title">
            <Text part="title-words">{stack.label}</Text>
          </View>
        </View>
      )}
      <View
        busy={props.loading}
        label={stack.label}
        part="page"
        role={derived.pageRole}
      >
        <Slot />
        {props.loading && (
          <View part="loading">
            <Text part="loading-words">{derived.loadingWords}</Text>
          </View>
        )}
        {!props.loading && !derived.rows && (
          <View part="empty">
            <Text part="empty-words">{derived.emptyWords}</Text>
          </View>
        )}
      </View>
      <Announce
        follows="status"
        part="live"
      >
        {derived.status}
      </Announce>
    </>
  ),
})
