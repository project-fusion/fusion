import { headless, oneOf, Slot, View } from '../../../render.js'
import { toolbar } from '../../../tree.js'

/**
 * Toolbar's headless tier: a group of controls that share one tab stop.
 *
 * **One stop, and the arrow keys move along it.** Right and Left move to the
 * next and the previous control in a horizontal toolbar, Down and Up in a
 * vertical one, and Home and End to the ends, from the last back to the
 * first unless `stop-at-ends` holds. A disabled control and one that takes no
 * focus, such as a divider, are passed over. The arrows across the axis are
 * left to the control. On the web, Tab enters on the control that last had
 * focus. A phone's controls are each its own focusable view, so there the
 * arrows move among them and Tab reaches each as the platform does.
 *
 * **What is a control on a phone** is a Helix press that hears its own keys,
 * such as a Button, an Icon Button, a Toggle, a Checkbox, or a Switch,
 * drawn anywhere inside the toolbar. A Button Group's buttons are each a
 * control of the toolbar's, as on the web.
 *
 * **The toolbar gives its axis to what it holds**, so a Divider in it runs
 * across it. **A toolbar inside another is a group of the outer one**,
 * `nested`: the outer toolbar's keys walk its controls, and it takes none of
 * its own. It draws in its own direction all the same.
 *
 * **Held to `helix-toolbar`.** `helix family check` compares the props, the
 * states, the region, and the part with what the manifest says the element
 * has.
 */
export default headless('toolbar', {
  props: {
    label: '',
    orientation: oneOf(['horizontal', 'vertical']),
    stopAtEnds: false,
  },
  events: {},
  states: ['horizontal', 'nested', 'settled', 'vertical'],
  toolbar: toolbar({ ends: 'stop-at-ends', orientation: 'orientation' }),
  render: ({ props }) => (
    <View
      label={props.label}
      orientation={props.orientation}
      part="toolbar"
      role="toolbar"
    >
      <Slot />
    </View>
  ),
})
