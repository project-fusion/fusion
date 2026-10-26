import {
  bare,
  boolean,
  cancelable,
  headless,
  number,
  oneOf,
  Pressable,
  Slot,
  set,
  string,
  View,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * An accordion section's headless tier: a trigger inside a heading, and the
 * content it opens and closes.
 *
 * **A press on the trigger opens or closes the section**, asking
 * `before-open` or `before-close` first, either of which a handler can
 * refuse. Its detail is `open`, the state the section would leave. The
 * trigger says it is expanded or collapsed, never checked. Used alone, with
 * no accordion around it, a section is a disclosure.
 *
 * **Closed content stays drawn**, so it can move as it opens and closes and
 * its words are in the page: `hidden="until-found"` and `inert` on the web,
 * and on a phone drawn with no press and nothing a screen reader reaches.
 *
 * **Open content is a region named by the summary**, so a screen reader
 * lists it among the page's regions. Under the accordion's `single`, the
 * open section's trigger is disabled to a screen reader, since a press
 * cannot close it, and keeps its stop.
 *
 * **`toggle` is sent once the section stands the other way**, however it
 * came to: a press, the page writing `open`, or the accordion closing it as
 * another opens. Its detail is `newState` and `oldState`, `open` or
 * `closed`.
 *
 * **The chevron turns with the section**, at the end of the trigger, at its
 * start under `chevron-placement="start"`, and not at all under `none`. An
 * icon passed into `chevron` takes its place.
 *
 * **The web's**: find in page and `hidden-until-found`, a `name` that makes
 * sections anywhere on the page one set, as `<details name>` does, the
 * content's height written as `--accordion-content-height`, and the
 * heading's level. React Native gives a view no heading level, so a phone
 * announces a heading with none, and `heading-level` is the web's.
 *
 * **Held to `helix-accordion-item`.** `helix family check` compares the
 * props, the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('accordion-item', {
  memberOf: set('accordion'),
  props: {
    chevronPlacement: oneOf(['auto', 'start', 'end', 'none']),
    defaultOpen: false,
    disabled: false,
    headingLevel: number(),
    /* Find in page and a group by name across the page, which a phone has none of. */
    hiddenUntilFound: web(boolean()),
    name: web(string()),
    open: boolean(),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['closing', 'open', 'settled'],
  derived: {
    chevronNone: derive('accordion-chevron-none'),
    chevronStart: derive('accordion-chevron-start'),
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ derived, props }) => (
    <View part="container">
      <View
        level={props.headingLevel}
        part="heading"
        role="heading"
      >
        <Pressable
          disabled={props.disabled}
          expanded={props.open}
          part="trigger"
          role="button"
          toggles
        >
          {derived.chevronStart && (
            <Slot name="chevron">
              <View
                ariaHidden
                icon="caret-down"
                part="chevron"
              />
            </Slot>
          )}
          <Slot name="summary" />
          {!derived.chevronNone && !derived.chevronStart && (
            <Slot name="chevron">
              <View
                ariaHidden
                icon="caret-down"
                part="chevron"
              />
            </Slot>
          )}
        </Pressable>
      </View>
      <View
        closed={!props.open}
        labelledby="summary"
        part="content"
        role={props.open ? 'region' : ''}
      >
        <View part="content-inner">
          <Slot />
        </View>
      </View>
    </View>
  ),
})
