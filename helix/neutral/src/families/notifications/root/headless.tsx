import {
  Announce,
  cancelable,
  headless,
  number,
  Pressable,
  Slot,
  Text,
  View,
  web,
} from '../../../render.js'
import { bind } from '../../../tree.js'

/**
 * Notifications' headless tier: a feed of notifications, each marked read or
 * unread, with a header, a footer, and a line that says why there are none.
 *
 * **The rows are written into it.** Each one joins the feed as it is first drawn,
 * through a group too, and every row draws again as one joins or leaves, so the
 * feed reads them in the order they stand. It does not window them.
 *
 * **Read state is reported.** `mark-all` draws a press while anything is unread,
 * which asks `before-read` of the feed and of each row, and a refused row stays
 * as it was. A row's own `before-read`, `read`, and `dismiss` are heard on the
 * feed after the row, as they bubble on the web.
 *
 * **What a screen reader hears.** Each row's words, with `unread-label` first
 * while it is unread. iOS and Android have no trait for a feed or an article, so
 * a phone reads the rows in order. What the web's live region says of the feed, a
 * phone announces, and so does a count of the unread rows that arrive above the
 * ones there were.
 *
 * **The web's**: `load-error`, the old name of `error-text`; Control with Home
 * and End, which leave the feed for the controls around it; each row's place in
 * `total`, which a phone has no article to say on; and printing.
 *
 * **Held to `helix-notifications`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('notifications', {
  props: {
    arrivedLabel: '{count, plural, one {# new notification} other {# new notifications}}',
    emptyText: '',
    errorText: '',
    fallbackLabel: 'Notifications',
    label: '',
    /* The old name of `error-text`, the web's for one release. */
    loadError: web(''),
    loading: false,
    loadingText: '',
    loadMore: false,
    loadMoreLabel: 'Load more',
    markAll: false,
    markAllLabel: 'Mark all as read',
    total: number(),
  },
  events: {
    beforeRead: cancelable(['read']),
    dismiss: cancelable(['label']),
    loadMore: [],
    read: ['read'],
  },
  states: ['empty', 'error', 'loading', 'media', 'settled', 'unread'],
  host: { label: bind('named'), role: 'region' },
  notificationsRoot: {
    arrivedLabel: 'arrivedLabel',
    blank: 'blank',
    emptyText: 'emptyText',
    errorShown: 'errorShown',
    errorText: 'errorText',
    errorWords: 'errorWords',
    fallbackLabel: 'fallbackLabel',
    footerEmpty: 'footerEmpty',
    headerEmpty: 'headerEmpty',
    label: 'label',
    loading: 'loading',
    loadingShown: 'loadingShown',
    loadingText: 'loadingText',
    marksAll: 'marksAll',
    named: 'named',
    onBeforeRead: 'beforeRead',
    onDismiss: 'dismiss',
    onLoadMore: 'loadMore',
    onRead: 'read',
    said: 'said',
    separation: 'separation',
    total: 'total',
  },
  render: ({ notificationsRoot, props }) => (
    <>
      <View
        data-empty={notificationsRoot.headerEmpty}
        hidden={notificationsRoot.headerEmpty}
        part="header"
      >
        <Slot name="header" />
        {notificationsRoot.marksAll && (
          <Pressable
            part="mark-all"
            role="button"
          >
            <Text part="mark-all-words">{props.markAllLabel}</Text>
          </Pressable>
        )}
      </View>
      <View
        busy={props.loading}
        label={props.label}
        part="list"
        role="feed"
      >
        <Slot />
        {notificationsRoot.errorShown && (
          <View part="error">
            <Slot name="error">
              <Text part="error-words">{notificationsRoot.errorWords}</Text>
            </Slot>
          </View>
        )}
        {notificationsRoot.loadingShown && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {notificationsRoot.blank && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </Slot>
          </View>
        )}
      </View>
      <Announce
        part="live"
        platform="web"
      />
      {props.loadMore && (
        <Pressable
          part="more"
          role="button"
        >
          <Text part="more-words">{props.loadMoreLabel}</Text>
        </Pressable>
      )}
      <View
        data-empty={notificationsRoot.footerEmpty}
        hidden={notificationsRoot.footerEmpty}
        part="footer"
      >
        <Slot name="footer" />
      </View>
    </>
  ),
})
