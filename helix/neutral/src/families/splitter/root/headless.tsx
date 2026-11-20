import {
  bare,
  cancelable,
  headless,
  number,
  numberOrString,
  oneOf,
  Slot,
  View,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Splitter's headless tier: what it takes, what it sends, and its parts.
 *
 * **Two panes and a divider between them a reader moves.** The divider's
 * value is the start pane's share of the splitter, as a percentage, which
 * `position` holds and `default-position` seeds. `min` and `max` bound it,
 * each a percentage or a length such as `16rem`, and `end-min` keeps the end
 * pane at least that long. `orientation="vertical"` stands the panes one
 * above the other, and `auto` does so where the splitter is narrower than
 * 32rem.
 *
 * **A drag on the divider moves it with the finger** and stands as it lets
 * go, landing on a `snap` place it comes near. A double tap puts it back at
 * `default-position`. The arrows along its axis move it by `step`, Home and
 * End take it to its bounds, and a screen reader's increment and decrement
 * move it by a step. Each move asks first with `before-resize`, `input`
 * follows each step of a drag and each move that stands, and `resized`
 * follows a move that stands.
 *
 * **A pane shuts** where the divider is moved to its edge, down to
 * `collapsed-size`, and Enter shuts the start pane and opens it again, or
 * the end pane where only that one is `collapsible`. Each asks first with
 * `before-collapse`, and `collapse` follows; a shut pane opens back to where
 * the divider stood before it shut. `primary` keeps one pane's length as the
 * splitter's own length changes.
 *
 * **Web only:** the corner where two dividers cross, which drags both, and
 * its words; F6 between the panes.
 */
export default headless('splitter', {
  props: {
    collapsed: oneOf(['end', 'start']),
    collapsedLabel: 'Collapsed',
    collapsedSize: 0,
    collapsible: oneOf(['both', 'end', 'none', 'start']),
    cornerLabel: web('Resize both'),
    cornerValueLabel: web('{across} across, {down} down'),
    defaultCollapsed: oneOf(['end', 'start']),
    defaultPosition: 50,
    endMin: numberOrString(0),
    fallbackLabel: 'Resize panes',
    label: '',
    max: numberOrString(100),
    min: numberOrString(0),
    orientation: oneOf(['auto', 'horizontal', 'vertical']),
    position: number(),
    primary: oneOf(['end', 'start']),
    snap: '',
    snapThreshold: 12,
    step: 2,
  },
  events: {
    beforeCollapse: cancelable(['value']),
    beforeResize: cancelable(['value']),
    collapse: ['value'],
    input: bare(),
    resized: ['value'],
  },
  states: ['collapsed', 'dragging', 'settled', 'vertical'],
  derived: {
    named: derive('splitter-name'),
  },
  range: {
    basis: 'basis',
    collapsed: 'collapsed',
    collapsedLabel: 'collapsedLabel',
    collapsedSize: 'collapsedSize',
    collapsedState: 'collapsed',
    collapsible: 'collapsible',
    defaultCollapsed: 'defaultCollapsed',
    defaultProp: 'defaultPosition',
    dragging: 'dragging',
    endMin: 'endMin',
    flush: 'flush',
    highest: 'highest',
    lowest: 'lowest',
    max: 'max',
    min: 'min',
    onBeforeChange: 'beforeResize',
    onBeforeCollapse: 'beforeCollapse',
    onChange: 'resized',
    onCollapse: 'collapse',
    onInput: 'input',
    orientation: 'orientation',
    primary: 'primary',
    prop: 'position',
    reading: 'reading',
    snap: 'snap',
    snapThreshold: 'snapThreshold',
    spoken: 'spoken',
    step: 'step',
    vertical: 'vertical',
  },
  render: ({ derived, range }) => (
    <>
      <View
        part="start"
        style={{ '--splitter-position': range.basis }}
      >
        <Slot name="start" />
      </View>
      <View
        data-flush={range.flush}
        label={derived.named}
        part="separator"
        role="separator"
        valuemax={range.highest}
        valuemin={range.lowest}
        valuenow={range.reading}
        valuetext={range.spoken}
      >
        <Slot name="handle" />
      </View>
      <View part="end">
        <Slot name="end" />
      </View>
      <View
        part="corner"
        platform="web"
      />
    </>
  ),
})
