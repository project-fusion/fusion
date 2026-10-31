import {
  boolean,
  cancelable,
  headless,
  Pressable,
  property,
  Slot,
  View,
  Wrap,
} from '../../../render.js'

/**
 * A notification's headless tier: what happened, when, and whether it has been
 * read.
 *
 * **Read state is reported.** `markRead` asks `before-read`, of the row and then
 * of the feed around it, and a refusal changes nothing. `read` set by the page
 * wins whenever it changes. `read` follows a change that stood.
 *
 * **A dismissal removes the row** once nothing refuses `dismiss`, which carries
 * the row's own words as `label`. The row stops drawing and leaves the feed, and
 * focus moves to the row beside it where it held focus.
 *
 * **A phone has no hover**, so the time and the dismiss press stand side by side,
 * as the web's do under a coarse pointer.
 *
 * **What a screen reader hears.** The label box is one element: `unread-label`
 * while it is unread, and the row's words. The controls in the row stand beside
 * it, since a phone would otherwise read the row as one element and reach none of
 * them.
 *
 * **The web's**: the row's `article` role, its place in the feed's `total`, and
 * Format Date's field parts, which an elapsed time does not draw.
 *
 * **Held to `helix-notification`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('notification', {
  props: {
    at: '',
    defaultRead: false,
    dismissible: false,
    dismissLabel: 'Dismiss {label}',
    locale: '',
    position: property(0),
    read: boolean(),
    setSize: property(0),
    stop: property(true),
    unreadLabel: 'Unread',
  },
  events: {
    beforeRead: cancelable(['read']),
    dismiss: cancelable(['label']),
    read: ['read'],
  },
  states: ['actions', 'controls', 'feedFilled', 'feedOutlined', 'read', 'settled'],
  notificationRow: {
    actionsFilled: 'actionsFilled',
    at: 'at',
    defaultRead: 'defaultRead',
    dismissible: 'dismissible',
    dismissLabel: 'dismissLabel',
    dismissName: 'dismissName',
    gone: 'gone',
    heard: 'heard',
    last: 'last',
    media: 'media',
    onBeforeRead: 'beforeRead',
    onDismiss: 'dismiss',
    onRead: 'read',
    read: 'read',
    separation: 'separation',
    stamped: 'stamped',
    unreadLabel: 'unreadLabel',
  },
  render: ({ notificationRow, props, state }) => (
    <>
      {!notificationRow.gone && (
        <View
          data-last={notificationRow.last}
          part="item"
          role="article"
        >
          {!state.read && (
            <View
              part="unread-dot"
              platform="native"
            />
          )}
          <View
            data-column={notificationRow.media}
            part="media"
          >
            <Slot name="media" />
          </View>
          <View part="body">
            <View
              label={notificationRow.heard}
              part="label"
              run
            >
              <Slot />
            </View>
            <Slot name="description" />
            <Slot name="detail" />
            <View part="actions">
              <Slot name="actions" />
            </View>
          </View>
          <View part="trailing">
            <View
              part="time"
              platform="web"
            />
            <View
              part="time-day"
              platform="web"
            />
            <View
              part="time-day-period"
              platform="web"
            />
            <View
              part="time-era"
              platform="web"
            />
            <View
              part="time-fractional-second"
              platform="web"
            />
            <View
              part="time-hour"
              platform="web"
            />
            <View
              part="time-minute"
              platform="web"
            />
            <View
              part="time-month"
              platform="web"
            />
            <View
              part="time-second"
              platform="web"
            />
            <View
              part="time-time-zone-name"
              platform="web"
            />
            <View
              part="time-weekday"
              platform="web"
            />
            <View
              part="time-year"
              platform="web"
            />
            <Wrap
              draws="format-date"
              gives={{ date: props.at, elapsed: true, locale: props.locale }}
              part="stamp"
              platform="native"
              when={notificationRow.stamped}
            />
            {props.dismissible && (
              <View part="controls">
                <Pressable
                  label={notificationRow.dismissName}
                  part="dismiss"
                  role="button"
                >
                  <Slot name="dismiss">
                    <View
                      ariaHidden
                      icon="x"
                      part="dismiss-mark"
                    />
                  </Slot>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </>
  ),
})
