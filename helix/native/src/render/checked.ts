/**
 * Whether a press is pressed or checked, as a screen reader hears it.
 */
import type { Node } from '../style/form'
import { holds } from './announced'
import { boundBy } from './behavior'
import { bound, read, type Values } from './styles'

/**
 * Whether a press stays pressed, as its `pressed` reads it, or `undefined`
 * where it reads nothing: **a button no group presses is no toggle**, as a
 * Button outside a Button Group's selection mode is a plain button.
 */
export const pressedOf = (values: Values, node: Node): boolean | undefined => {
  const pressed = bound(values, node.attributes?.pressed, node.name)
  return typeof pressed === 'boolean' ? pressed : undefined
}

/**
 * Whether a press is checked: as its `checked` or its `pressed` says, or,
 * where it `toggles`, as the toggle's binding gives its part, `mixed` among
 * them. `undefined` for a press that is none of these, and for one that
 * toggles and says it is `expanded`, which opens. **The press that chooses
 * an item of a set that mixes commands and choices is checked as the item
 * holds it**, and a command is neither, as the web's Menu Item writes
 * `aria-checked` on a choice row alone.
 */
export const checkedOf = (values: Values, node: Node): boolean | 'mixed' | undefined => {
  if (values.family.api?.item?.checked !== undefined && node.attributes?.chooses === true) {
    const held = boundBy(values.behavior, node.name, 'checked')
    return typeof held === 'boolean' ? held : undefined
  }
  if (node.attributes?.checked !== undefined) {
    return holds(values, node, 'checked')
  }
  const pressed = pressedOf(values, node)
  if (pressed !== undefined) {
    return pressed
  }
  if (!onAndOff(values, node)) {
    return undefined
  }
  if (read(values, 'mixed', node.name) === true) {
    return 'mixed'
  }
  return read(values, 'checked', node.name) === true
}

/**
 * Whether a press turns its element on and off, and is checked as it stands:
 * not a press that opens, which says it is expanded, as a disclosure's
 * trigger does, nor one that closes, as a callout's dismiss button.
 */
export const onAndOff = (values: Values, node: Node): boolean =>
  node.attributes?.toggles === true &&
  node.attributes.expanded === undefined &&
  values.family.api?.toggle?.closes === undefined
