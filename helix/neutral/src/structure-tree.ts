/*
 * Where a family's part tree draws each node, as the structural judge in
 * `structure.ssr.spec.ts` holds a web element to it: the parts and regions a
 * render with some props turned on draws, under which part, with what role,
 * and whether each must be drawn.
 */
import type { Place, Places } from './drawn.js'
import type { Headless, Node } from './tree.js'

/** Whether a prop is set, by its default or by `set`. */
const holds = (family: Headless, name: string, set: ReadonlySet<string>): boolean =>
  set.has(name) || family.props.some((prop) => prop.name === name && prop.default === true)

/** Where the tree draws, and whether what it draws there is decorative. */
interface Around {
  readonly hidden: boolean
  /** Whether what is drawn here may be left out, as what shows once the element reads its regions. */
  readonly loose?: boolean
  readonly parent: string
  readonly set: ReadonlySet<string>
}

/**
 * The role a node draws with. A live node is a live region on the web, a
 * `status`, or an `alert` where it is urgent, and a role a value the element
 * computes gives, or a prop picks, is any role, `*`.
 */
const roleOf = (node: Node): string => {
  const { role, urgent } = node.attributes ?? {}
  if (node.kind === 'live') {
    return urgent === true ? 'alert' : 'status'
  }
  if (typeof role === 'string') {
    return role
  }
  return typeof role === 'object' && role !== null && ('bind' in role || 'pick' in role) ? '*' : ''
}

/** The place one node of the tree draws itself at. */
const placeOf = (node: Node, around: Around, part: string): Place => {
  const attributes = node.attributes ?? {}
  return {
    hidden: around.hidden || attributes.decorative === true,
    optional: attributes.platform === 'web' || around.loose === true,
    parent: around.parent,
    part,
    role: roleOf(node),
  }
}

/**
 * Whether a node draws no element of its own, or nothing at all, by default:
 * words, and a live node said once something turns on, changes, or arrives.
 */
const unseen = (node: Node): boolean =>
  node.kind === 'text' ||
  (node.kind === 'live' &&
    ['arrives', 'follows', 'while'].some((name) => name in (node.attributes ?? {})))

/** The parts that are another element drawn around what the tree passes into it. */
export const wrapsOf = (nodes: readonly Node[]): Set<string> =>
  new Set(
    nodes.flatMap((node) => [
      ...(node.kind === 'wrap' && node.attributes?.draws !== undefined ? [node.name] : []),
      ...wrapsOf(node.children ?? []),
    ]),
  )

/** Whether a node draws only its children, a `when` while its prop is set and a `wrap` always. */
const passes = (family: Headless, node: Node, around: Around): boolean | undefined => {
  /* A repeat of what only a phone draws, as an outline's links, draws
     nothing of its own on the web. */
  const nativeOnly = (node.children ?? []).every((one) => one.attributes?.platform === 'native')
  /* A wrap that draws an element is that element, a part of its own. */
  if (node.kind === 'wrap' && node.attributes?.draws === undefined) {
    return true
  }
  if (node.kind === 'repeat' && nativeOnly) {
    return true
  }
  if (node.kind !== 'when') {
    return undefined
  }
  /* An `unless()` draws while its prop is not set. */
  return holds(family, node.name, around.set) !== (node.attributes?.unless === true)
}

/** Whether `name` is a value the element computes from whether a region holds something. */
const readsRegion = (family: Headless, name: string): boolean => {
  const computed = family.derived?.[name]
  return (
    computed !== undefined &&
    'bind' in computed &&
    !family.props.some((prop) => prop.name === computed.bind)
  )
}

/** The key one node of the tree is known by, and the place it draws at. */
const treePlace = (node: Node, around: Around): readonly [key: string, place: Place] => {
  if (node.kind === 'region') {
    const part = typeof node.attributes?.part === 'string' ? node.attributes.part : ''
    return [`region:${node.name}`, placeOf(node, around, part)]
  }
  return [`part:${node.name}`, placeOf(node, around, node.name)]
}

/** What the web draws of a node only a phone draws: a wrap's children, and nothing else. */
const onTheWeb = (node: Node): readonly Node[] =>
  node.kind === 'wrap' ? (node.children ?? []) : []

/**
 * Where one node passes its children on without a place of its own, which
 * it places in `into`, or `false` where the node has a place.
 */
const passedOn = (family: Headless, node: Node, around: Around, into: Places): boolean => {
  const children = node.children ?? []
  /* A node only a phone draws, as a checkbox's tick, which the web draws as
     a mask. A wrap only a phone draws leaves its children to the web, as a
     stat's figure line does. */
  if (node.attributes?.platform === 'native') {
    treePlaces(family, onTheWeb(node), around, into)
    return true
  }
  /* **A server cannot see what is passed into a region**, so what a `when`
     on whether a region holds something draws may be drawn or not, as a
     collection's empty words are once it has counted its rows. */
  if (node.kind === 'when' && readsRegion(family, node.name)) {
    treePlaces(family, children, { ...around, loose: true }, into)
    return true
  }
  const through = passes(family, node, around)
  if (through === undefined) {
    return false
  }
  if (through) {
    treePlaces(family, children, around, into)
  }
  return true
}

/** What the tree draws with the props in `around.set` turned on, as places. */
export const treePlaces = (
  family: Headless,
  nodes: readonly Node[],
  around: Around,
  into: Places,
): Places => {
  for (const node of nodes) {
    if (passedOn(family, node, around, into)) {
      continue
    }
    /* A live region that speaks as a value changes may be drawn from the
       start, as a collection's status is, or not at all. */
    if (node.kind === 'live' && 'follows' in (node.attributes ?? {})) {
      const [key, place] = treePlace(node, around)
      into.set(key, { ...place, optional: true })
      continue
    }
    if (unseen(node)) {
      continue
    }
    const [key, place] = treePlace(node, around)
    into.set(key, place)
    const parent = place.part || around.parent
    treePlaces(family, node.children ?? [], { ...around, hidden: place.hidden, parent }, into)
  }
  return into
}
