import { headless, property, Slot, string, View } from '../../../render.js'

/**
 * A lightbox item's headless tier: one picture, video frame, or chart the
 * viewer can show, with a line under it.
 *
 * **The viewer decides which item shows**, and each item is a slide: a
 * `group` whose role description is the viewer's `slide-role-label`, named by
 * its `label`, or by its place in the set where it has none. An item that is
 * not current is hidden and stays drawn, as a tab panel does.
 *
 * **On a phone the viewer passes each item its name and its role's words**,
 * `position` and `role-label`, since a phone has no set to read them from.
 *
 * **Held to `helix-lightbox-item`.**
 */
export default headless('lightbox-item', {
  props: {
    current: false,
    label: '',
    /* The item's name as the viewer writes it: its `label`, or its place. */
    position: property(string()),
    /* The words a screen reader says in place of the role. */
    roleLabel: property(string()),
    value: '',
  },
  states: ['current', 'settled'],
  render: ({ props }) => (
    <View
      description={props.roleLabel}
      hidden={!props.current}
      label={props.position}
      part="item"
      role="group"
    >
      <Slot />
      <Slot name="description" />
    </View>
  ),
})
