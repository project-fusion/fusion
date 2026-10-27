import { cancelable, headless, Slot, string, View } from '@fusion.dev/helix-neutral/render'

/**
 * Acme's tab set: a row of tabs, one of them chosen.
 *
 * **The set holds which tab is chosen, and its tabs join it**, paired by
 * `value`. The arrow keys move between the tabs and choose where they
 * arrive.
 */
export default headless('tabs', {
  props: {
    active: string(),
    defaultActive: '',
    label: '',
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['value']),
    beforeSelect: cancelable(['value']),
  },
  states: [],
  collection: {
    defaultProp: 'defaultActive',
    keys: { loop: true, selectionFollowsFocus: true },
    onBeforeChange: 'beforeActivate',
    onChange: 'activate',
    prop: 'active',
  },
  render: ({ props }) => (
    <View
      label={props.label}
      part="tabs"
      role="tablist"
    >
      <Slot />
    </View>
  ),
})
