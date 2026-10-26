import { cancelable, headless, Pressable, Slot, set, string, View, web } from '../../../render.js'

/**
 * A tab's headless tier.
 *
 * **A tab is an item of its tab set**, chosen when its `value` is the set's,
 * and pressing it chooses it. `selected` is the set's word: a tab with no set
 * around it reads its own.
 *
 * **A dismissible tab closes from a mark that is for the pointer.** The mark
 * is hidden from screen readers, so the tab offers the same press to them as
 * an action of its own. The tab does not remove itself: its owner does.
 */
export default headless('tab', {
  memberOf: set('tabs', { pressChooses: true }),
  props: {
    disabled: false,
    dismissLabel: 'Close',
    dismissible: false,
    selected: false,
    value: '',
    /* A link's, for tabs a router drives, each still controlling its panel. */
    href: string(),
    rel: web(string()),
    target: web(string()),
  },
  events: {
    dismiss: cancelable(['label']),
    beforeSelect: cancelable(['value']),
  },
  states: ['selected', 'settled'],
  render: ({ props, send }) => (
    <Pressable
      part="tab"
      chooses
      role="tab"
      href={props.href}
      disabled={props.disabled}
      selected={props.selected}
      onPress={send.beforeSelect}
    >
      <Slot part="label" />
      {props.dismissible && (
        <Pressable
          part="dismiss"
          ariaHidden
          label={props.dismissLabel}
          disabled={props.disabled}
          onPress={send.dismiss}
        >
          <Slot name="dismiss-icon">
            <View
              part="dismiss-mark"
              ariaHidden
              icon="x"
            />
          </Slot>
        </Pressable>
      )}
    </Pressable>
  ),
})
