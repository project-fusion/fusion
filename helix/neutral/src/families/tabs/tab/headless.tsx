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
  memberOf: set('tabs'),
  props: {
    disabled: false,
    dismissible: false,
    dismissLabel: 'Close',
    /* `href`, `rel`, and `target` are a link's, for tabs a router drives,
       each still controlling its panel. */
    href: string(),
    rel: web(string()),
    selected: false,
    target: web(string()),
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
    dismiss: cancelable(['label']),
  },
  states: ['selected', 'settled'],
  render: ({ props, send }) => (
    <Pressable
      disabled={props.disabled}
      href={props.href}
      onPress={send.beforeSelect}
      part="tab"
      role="tab"
      selected={props.selected}
      selects
    >
      <Slot part="label" />
      {props.dismissible && (
        <Pressable
          ariaHidden
          disabled={props.disabled}
          label={props.dismissLabel}
          onPress={send.dismiss}
          part="dismiss"
        >
          <Slot name="dismiss-icon">
            <View
              ariaHidden
              icon="x"
              part="dismiss-mark"
            />
          </Slot>
        </Pressable>
      )}
    </Pressable>
  ),
})
