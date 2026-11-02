import {
  Announce,
  cancelable,
  headless,
  number,
  Pressable,
  Repeat,
  Slot,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * Pagination's headless tier: a row of controls that moves through numbered pages.
 *
 * **It holds the page, whoever set it**, clamped to the pages it has, and moves
 * through a request a handler may refuse. Core's arithmetic says which pages show
 * and where a gap stands. A gap is a control that goes to the middle of what it
 * hides. The first, previous, next, and last controls are inert at the end each
 * points at. `compact` shows the page and the count in place of the numbers.
 *
 * **A phone keeps a reader on the page they chose.** After a gap or a step that
 * reached its end, focus goes to the current page. The move is said politely,
 * whoever made it.
 *
 * **The web's**: `href`, which makes each control a link, since a phone has no
 * link node here, and its address template.
 *
 * **Held to `helix-pagination`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('pagination', {
  props: {
    boundaries: 1,
    compact: false,
    defaultPage: 1,
    ends: false,
    fallbackLabel: 'Pagination',
    firstLabel: 'First page',
    gapLabel: 'Skip to page {page}',
    href: web(''),
    label: '',
    lastLabel: 'Last page',
    locale: '',
    nextLabel: 'Next page',
    page: number(),
    pageLabel: 'Page {page}',
    pages: 0,
    pageSize: 0,
    previousLabel: 'Previous page',
    siblings: 1,
    statusLabel: '{page} of {pages}',
    total: 0,
  },
  events: {
    beforeNavigate: cancelable(['page', 'value']),
    navigate: ['page', 'value'],
  },
  states: ['empty', 'settled'],
  host: { role: 'navigation' },
  paginationRoot: {
    atEnd: 'atEnd',
    atStart: 'atStart',
    boundaries: 'boundaries',
    compact: 'compact',
    defaultPage: 'defaultPage',
    empty: 'empty',
    ends: 'ends',
    fallbackLabel: 'fallbackLabel',
    firstLabel: 'firstLabel',
    gapLabel: 'gapLabel',
    label: 'label',
    lastLabel: 'lastLabel',
    locale: 'locale',
    nextLabel: 'nextLabel',
    onBeforeNavigate: 'beforeNavigate',
    onNavigate: 'navigate',
    page: 'page',
    pageLabel: 'pageLabel',
    pages: 'pages',
    pageSize: 'pageSize',
    previousLabel: 'previousLabel',
    siblings: 'siblings',
    slots: 'slots',
    status: 'status',
    statusLabel: 'statusLabel',
    total: 'total',
  },
  render: ({ entry, paginationRoot, props }) => (
    <>
      {props.ends && (
        <Pressable
          disabled={paginationRoot.atStart}
          label={props.firstLabel}
          part="first"
          role="button"
        >
          <Slot name="first-icon">
            <View
              ariaHidden
              icon="caret-double-left"
              part="mark"
            />
          </Slot>
        </Pressable>
      )}
      <Pressable
        disabled={paginationRoot.atStart}
        label={props.previousLabel}
        part="previous"
        role="button"
      >
        <Slot name="previous-icon">
          <View
            ariaHidden
            icon="caret-left"
            part="mark"
          />
        </Slot>
      </Pressable>
      {props.compact ? (
        <View part="status">
          <Text
            part="status-words"
            platform="native"
          >
            {paginationRoot.status}
          </Text>
        </View>
      ) : (
        <View
          part="list"
          role="list"
        >
          <Repeat
            each={paginationRoot.slots}
            key="key"
            part="slots"
          >
            <View
              part="item"
              role="listitem"
            >
              <Pressable
                also={{ 'page-current': entry.chosen }}
                current={entry.current}
                data-current={entry.chosen}
                data-gap={entry.gap}
                data-pressed={entry.pressed}
                label={entry.label}
                part="page"
                role="button"
              >
                <Text
                  part="number"
                  platform="native"
                >
                  {entry.shown}
                </Text>
              </Pressable>
              <View
                part="gap"
                platform="web"
              />
            </View>
          </Repeat>
        </View>
      )}
      <Pressable
        disabled={paginationRoot.atEnd}
        label={props.nextLabel}
        part="next"
        role="button"
      >
        <Slot name="next-icon">
          <View
            ariaHidden
            icon="caret-right"
            part="mark"
          />
        </Slot>
      </Pressable>
      {props.ends && (
        <Pressable
          disabled={paginationRoot.atEnd}
          label={props.lastLabel}
          part="last"
          role="button"
        >
          <Slot name="last-icon">
            <View
              ariaHidden
              icon="caret-double-right"
              part="mark"
            />
          </Slot>
        </Pressable>
      )}
      <Announce
        part="live"
        platform="web"
      />
    </>
  ),
})
