import { headless, property, Slot, set, string, View } from '../../../render.js'

/**
 * A tab panel's headless tier.
 *
 * **A panel is an item of its tab set that never chooses.** It shows while
 * its tab is chosen, and a hidden panel stays mounted, so what was typed into
 * it is there when the reader comes back.
 */
export default headless('tab-panel', {
  memberOf: set('tabs'),
  props: {
    /* The words of the tab that opens it, which the set passes on. */
    label: property(string()),
    lazy: false,
    selected: false,
    value: '',
  },
  events: {
    load: [],
  },
  states: ['loaded', 'selected', 'settled'],
  /* Under `lazy`, the content is drawn the first time the panel shows, and
     stays. */
  render: ({ props }) => (
    <View
      hidden={!props.selected}
      label={props.label}
      part="panel"
      role="tabpanel"
    >
      <Slot lazy={props.lazy} />
    </View>
  ),
})
