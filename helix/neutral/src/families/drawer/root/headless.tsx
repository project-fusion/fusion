import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
  Slot,
  View,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Drawer's headless tier: a panel that slides in from an edge of the
 * window, opened on `open`.
 *
 * **It comes from `placement`**, the end where it names none, which the
 * writing direction turns into a side. **It is modal unless `modal` is
 * false**: a modal drawer holds the reader until it closes, as Dialog does,
 * and one that is not leaves the page usable. Opening moves focus to its
 * first control, and closing puts focus back where it was.
 *
 * **Every way out asks `before-close` first**, which a handler may refuse:
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape; a press outside a modal drawer; a swipe out through its edge; and
 * the close control `dismissible` draws, named by `dismiss-label`.
 * `closedby` says which of the first three a reader has, and `persistent`
 * keeps all three from closing it, while the close control still closes
 * it. A drawer that is not modal closes on a close request alone where
 * `closedby` names nothing.
 *
 * **A touch swipes it toward its edge** unless `swipe` is false. A swipe
 * past halfway, or a quick one, takes it out. `snap-points` lists the
 * shares of the panel a reader can leave on screen, such as `0.5 1`: it
 * opens at the smallest, a swipe rests it at the nearest, and it is
 * `snapped` while it rests short of the whole. **A list inside the panel
 * hands its drag to the panel** once the list stands at the end the drag
 * scrolls it toward, its top for a drawer at the bottom, and has stood
 * still there for half a second, so the momentum of a list flung to its
 * top does not take the drawer with it. While the panel rests short of the
 * whole, a drag away from its edge opens it further.
 *
 * **Its name is `label`**, then the words of the title passed into
 * `header`, then `fallback-label`. A phone says its name as it opens.
 *
 * **The web's**: the invoker commands, `close(value)` and `returnValue`,
 * `snapTo()`, a `<form method="dialog">` closing it, the page's scroll held
 * still, the swipe's travel written as `--drawer-swipe-x` and
 * `--drawer-swipe-y`, and a description drawn from the words at the start
 * of its body. React Native has no command or form to take, and moves the
 * panel itself.
 *
 * **Held to `helix-drawer`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('drawer', {
  props: {
    closedby: oneOf(['any', 'closerequest', 'none']),
    defaultOpen: false,
    dismissible: false,
    dismissLabel: 'Close',
    fallbackLabel: 'Drawer',
    label: '',
    modal: true,
    open: boolean(),
    persistent: false,
    placement: oneOf(['start', 'end', 'top', 'bottom']),
    snapPoints: '',
    swipe: true,
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    close: bare(),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['entering', 'exiting', 'open', 'settled', 'snapped'],
  derived: {
    dismissal: derive('drawer-dismissal'),
    dismissName: derive('drawer-dismiss-name'),
    edge: derive('drawer-edge'),
    name: derive('drawer-name'),
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onClose: 'close',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ derived, props }) => (
    <Layer
      closedby={derived.dismissal}
      label={derived.name}
      modal={props.modal}
      open={props.open}
      part="panel"
      role="dialog"
      side={derived.edge}
      snapPoints={props.snapPoints}
      swipe={props.swipe}
    >
      <View part="header">
        <Slot name="header" />
      </View>
      <View part="content">
        <Slot />
      </View>
      <View part="footer">
        <Slot name="footer" />
      </View>
      {props.dismissible && (
        <Pressable
          label={derived.dismissName}
          part="dismiss"
          role="button"
          toggles
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
      <Announce
        arrives
        part="opening"
        platform="native"
      >
        {derived.name}
      </Announce>
    </Layer>
  ),
})
