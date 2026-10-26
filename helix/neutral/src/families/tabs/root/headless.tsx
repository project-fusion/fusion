import { cancelable, headless, oneOf, Pressable, Slot, string, View } from '../../../render.js'

/**
 * A tab set's headless tier: what it takes, what it sends, and its parts.
 *
 * **The set holds which tab is chosen, and its tabs and panels join it.** A
 * tab and a panel are items of the set's collection, paired by `value`: the
 * web element reads its children for them, and a native one is joined by
 * them through a context, in render order.
 *
 * **The indicator marks the chosen tab.** It is measured from the chosen
 * tab's box, which sets `indicator-x`, `indicator-y`, and its size, and
 * `data-placed` once it has been placed.
 *
 * **Held to `helix-tabs`.** `helix family check` compares the props, events,
 * states, regions, and parts with what the manifest says the element has.
 */
export default headless('tabs', {
  props: {
    active: string(),
    defaultActive: '',
    label: '',
    manual: false,
    orientation: oneOf(['horizontal', 'vertical']),
    scrollControls: false,
    variant: oneOf(['segmented', 'underlined']),
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['value']),
    /* A tab's choice, which reaches the set before the set acts on it. */
    beforeSelect: cancelable(['value']),
  },
  states: ['settled'],
  collection: {
    defaultProp: 'defaultActive',
    /* **The keys come round from the last tab, and choose where they
       arrive**, as the web's tab set does, unless the set is manual. */
    keys: { loop: true, selectionFollowsFocus: true },
    manualActivation: 'manual',
    onBeforeChange: 'beforeActivate',
    onChange: 'activate',
    prop: 'active',
  },
  render: ({ props }) => (
    <>
      <View
        label={props.label}
        orientation={props.orientation}
        part="tabs"
        role="tablist"
      >
        {/* For a pointer, and hidden from screen readers, which reach every tab
              with the list's own keys. Each is drawn while the strip has more
              past its end. */}
        {props.scrollControls && (
          <Pressable
            ariaHidden
            part="scroll-start"
            scrolls="start"
          >
            <Slot name="scroll-start-icon">
              <View
                ariaHidden
                icon="caret-start"
                part="scroll-start-mark"
              />
            </Slot>
          </Pressable>
        )}
        <Slot />
        <View
          ariaHidden
          marks="chosen"
          part="indicator"
        >
          <Slot name="indicator" />
        </View>
        {props.scrollControls && (
          <Pressable
            ariaHidden
            part="scroll-end"
            scrolls="end"
          >
            <Slot name="scroll-end-icon">
              <View
                ariaHidden
                icon="caret-end"
                part="scroll-end-mark"
              />
            </Slot>
          </Pressable>
        )}
      </View>
      <View part="panels">
        <Slot name="panels" />
      </View>
    </>
  ),
})
