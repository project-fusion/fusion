import {
  bare,
  boolean,
  cancelable,
  headless,
  number,
  Pressable,
  Slot,
  Text,
  View,
} from '../../../render.js'
import { bind } from '../../../tree.js'

/**
 * A group of notifications' headless tier: a named set of them, which can fold to
 * the first.
 *
 * **A press on the trigger folds and unfolds a `collapsible` group**, asking
 * `before-open` or `before-close` first, and `toggle` says it stood. The rows it
 * folds stay in the feed, so `unread` still counts them, and draw nothing.
 *
 * **`count` is the number the group stands for**, which may be more than the rows
 * written in it, and is the number of rows where it is not set.
 *
 * **What a screen reader hears.** The label and the count, as the trigger's name
 * where the group folds, and whether it is expanded.
 *
 * **Held to `helix-notification-group`.** `helix system check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('notification-group', {
  props: {
    collapsible: false,
    count: number(),
    defaultOpen: false,
    label: '',
    open: boolean(),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['open', 'settled'],
  host: { label: bind('label'), role: 'article' },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  notificationGroup: {
    collapsible: 'collapsible',
    count: 'count',
    countWords: 'countWords',
    counted: 'counted',
    label: 'label',
  },
  render: ({ notificationGroup, props }) => (
    <>
      <View part="header">
        {props.collapsible && (
          <Pressable
            expanded={props.open}
            part="trigger"
            role="button"
            toggles
          >
            <View part="label">
              <Slot name="label">
                <Text part="label-words">{props.label}</Text>
              </Slot>
            </View>
            <View part="count">
              <Text part="count-words">{notificationGroup.countWords}</Text>
            </View>
          </Pressable>
        )}
        {!props.collapsible && (
          <View part="label">
            <Slot name="label">
              <Text part="label-words">{props.label}</Text>
            </Slot>
          </View>
        )}
        {!props.collapsible && (
          <View part="count">
            <Text part="count-words">{notificationGroup.countWords}</Text>
          </View>
        )}
        <View part="actions">
          <Slot name="actions" />
        </View>
      </View>
      <View
        label={props.label}
        part="items"
        role="feed"
      >
        <Slot />
      </View>
    </>
  ),
})
