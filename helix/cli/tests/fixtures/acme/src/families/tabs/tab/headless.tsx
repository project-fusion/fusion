import { cancelable, headless, Pressable, Slot, set, View } from '@fusion.dev/helix-neutral/render'

/**
 * Acme's tab: an item of its tab set, chosen when its `value` is the set's.
 * Pressing it chooses it.
 *
 * **A tab with a `count` draws an Acme badge after its words**, which shows
 * the count.
 */
export default headless('tab', {
  memberOf: set('tabs'),
  props: {
    count: '',
    disabled: false,
    selected: false,
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
  },
  states: ['selected'],
  render: ({ props, send }) => (
    <Pressable
      disabled={props.disabled}
      onPress={send.beforeSelect}
      part="tab"
      role="tab"
      selected={props.selected}
      selects
    >
      <Slot part="label" />
      {props.count && (
        <View
          draws="badge"
          gives={{ value: props.count }}
          part="count"
        />
      )}
    </Pressable>
  ),
})
