import { type Behavior, merged, type Props, STILL } from '../render/behavior'
import { inToolbarAs, useToolbarAxis } from '../render/toolbar'
import type { Family, Node } from '../style/form'
import { given } from './props'
import { useToolbar } from './toolbar'

/** The `vertical` mark, which the element's styles read as its `vertical` state. */
const VERTICAL: Behavior = { marks: ['vertical'], parts: {} }

/**
 * Whether an element runs across a toolbar: one with an `orientation` prop and
 * a `vertical` state, as a divider has. A toolbar runs its own way, inside
 * another as well.
 */
export const turnsInToolbar = (family: Family): boolean =>
  family.api?.states.includes('vertical') === true &&
  family.api.toolbar === undefined &&
  family.api.props.some((prop) => prop.name === 'orientation')

/**
 * The direction an element is drawn in: its `orientation`, else across the
 * toolbar around it, else horizontal. **Vertical is a mark**, as the web
 * element's `vertical` state, so its styles read `:state(vertical)` on both
 * platforms. The same answer as core's `toolbarAround` and `toolbarAxis` give
 * the web element, read from the toolbar the native tree gives.
 */
export const useAxis = (props: Props): Behavior => {
  const toolbar = useToolbarAxis()
  const set = props.orientation
  const drawn =
    set === 'horizontal' || set === 'vertical'
      ? set
      : toolbar === undefined
        ? 'horizontal'
        : toolbar === 'vertical'
          ? 'horizontal'
          : 'vertical'
  return drawn === 'vertical' ? VERTICAL : STILL
}

/** Each node of a tree, depth first. */
const every = (nodes: readonly Node[] | undefined): Node[] =>
  (nodes ?? []).flatMap((node) => [node, ...every(node.children)])

/** Whether a node's role may be a toolbar: written as one, or picked as one by a prop. */
const mayBeToolbar = (node: Node): boolean => {
  const role = node.attributes?.role
  return (
    role === 'toolbar' ||
    (typeof role === 'object' &&
      role !== null &&
      'values' in role &&
      Object.values(role.values as Readonly<Record<string, string>>).includes('toolbar'))
  )
}

/** The role a node takes from the element's props: as written, or as a prop's value picks it. */
const roleOf = (family: Family, props: Props, node: Node): unknown => {
  const role = node.attributes?.role
  if (typeof role !== 'object' || role === null || !('pick' in role)) {
    return role
  }
  const held = given(family, props, String(role.pick))
  const by = role.values as Readonly<Record<string, string>>
  return typeof held === 'string' && held in by ? by[held] : role.otherwise
}

/**
 * **A part that is a toolbar is a group inside a toolbar**, as `inToolbarAs`
 * says of every set and part, so a reader meets one toolbar. The part is
 * announced as a group while a toolbar is around it.
 */
const useNested = (family: Family, parts: readonly Node[], props: Props): Behavior => {
  const inside = useToolbarAxis() !== undefined
  if (!inside) {
    return STILL
  }
  const demoted = parts.filter((node) => {
    const role = roleOf(family, props, node)
    return inToolbarAs(role, inside) !== role
  })
  return {
    marks: [],
    parts: Object.fromEntries(
      demoted.map((node) => [node.name, { view: { accessibilityRole: undefined, role: 'group' } }]),
    ),
  }
}

/**
 * What a toolbar around an element gives it, where it reads one: the
 * direction it is drawn in, and a group in place of a toolbar of its own.
 * **An element that is a toolbar runs its roving focus here too**, as its
 * form binds it, so what it holds reads its axis and joins its controls.
 */
export const aroundToolbar = (family: Family): ((props: Props) => Behavior) => {
  const turns = turnsInToolbar(family)
  const toolbars = every(family.tree).filter(mayBeToolbar)
  const own =
    family.api?.toolbar === undefined
      ? undefined
      : family.machines?.find((use) => use.machine === 'roving-focus')
  if (!turns && toolbars.length === 0 && own === undefined) {
    return () => STILL
  }
  const useTurn = turns ? useAxis : () => STILL
  const useOwn = own === undefined ? () => STILL : (props: Props) => useToolbar(family, props, own)
  return (props) => merged(useTurn(props), useNested(family, toolbars, props), useOwn(props))
}
