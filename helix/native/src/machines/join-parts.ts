/**
 * What a set lays over the parts of an item that joins it: the press that
 * chooses the item, its host, and what the set gives each part, with the
 * parts of the item's tree those read.
 */
import type { PartBinding } from '../render/behavior'
import type { Node } from '../style/form'
import type { Offer } from './collection'

/** The first part in `tree` whose press chooses the item, or turns it, as the tree marks it. */
export const chooserIn = (
  tree: readonly Node[] | undefined,
  flag: 'chooses' | 'toggles' = 'chooses',
): Node | undefined => {
  for (const node of tree ?? []) {
    if (node.kind === 'pressable' && node.attributes?.[flag] === true) {
      return node
    }
    const inner = chooserIn(node.children, flag)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/** The name of the first part in `tree` whose press chooses the item, as the tree marks it. */
export const chooserOf = (tree: readonly Node[] | undefined): string | undefined =>
  chooserIn(tree)?.name

/**
 * The event a press on the part that chooses the item sends first, such as a
 * tab's `select`, where it sends one.
 */
export const askedBy = (tree: readonly Node[] | undefined): string | undefined => {
  const sends = chooserIn(tree)?.attributes?.sends
  return typeof sends === 'string' ? sends : undefined
}

/** The prop the part that chooses the item reads its `disabled` from, where it reads one. */
export const disabledBy = (tree: readonly Node[] | undefined): string | undefined => {
  const disabled = chooserIn(tree)?.attributes?.disabled
  return typeof disabled === 'object' && disabled !== null && 'bind' in disabled
    ? String(disabled.bind)
    : undefined
}

/**
 * The item's own state while its set chooses it, as a Button's `pressed`,
 * where its form names one and its set shows its items as radios or toggle
 * buttons, and nothing otherwise.
 */
const shownState = (
  offer: Offer,
  value: string,
  state: string | undefined,
): Readonly<Record<string, boolean>> =>
  state === undefined || offer.shows === undefined || value === ''
    ? {}
    : { [state]: offer.chosen(value) }

/** What an item's set lays over its parts beside what the set gives each part. */
export interface Over {
  /** The prop that says the item is chosen, where it is not `selected`, as a step's `current`. */
  readonly flag?: string | undefined
  /** The prop a disabled set reads as `true` on the item. */
  readonly off: string | undefined
  /** The prop a set that reaches a disabled item reads as `false` on its press. */
  readonly on: string | undefined
  /** The item's own state that holds while its set chooses it, where its form names one. */
  readonly state?: string | undefined
  /** Whether the item turns on and off where it has joined no set, as a toggle does. */
  readonly turns: boolean
  readonly view: Readonly<Record<string, unknown>>
}

/** A state set to `held` where `name` names one, and nothing otherwise. */
const stateIf = (name: string | undefined, held: boolean): Readonly<Record<string, boolean>> =>
  name === undefined ? {} : { [name]: held }

/**
 * What an item's set lays over the press that chooses it: the `disabled` it
 * lifts or casts, its view, whether an item that turns is checked, and the
 * radio it is announced as **where its set shows its items as radios**.
 */
const onChooser = (
  binding: PartBinding | undefined,
  offer: Offer | undefined,
  value: string,
  over: Over,
): PartBinding => {
  const turned = over.turns && offer !== undefined
  const states = {
    ...binding?.states,
    ...stateIf(over.on, false),
    ...stateIf(over.off, true),
    /* The press that turned the item is checked as the set chooses it. */
    ...(turned ? { checked: offer.chosen(value) } : {}),
  }
  const radio = offer?.shows === 'radio' ? { accessibilityRole: 'radio' } : {}
  return { ...binding, states, view: { ...binding?.view, ...over.view, ...radio } }
}

/**
 * What an item's set lays over its host: `selected` while the set chooses
 * it, and the state its form names.
 */
const onHost = (
  binding: PartBinding | undefined,
  offer: Offer | undefined,
  value: string,
  over: Over,
): PartBinding => {
  if (offer === undefined) {
    return { ...binding }
  }
  const states = {
    ...binding?.states,
    ...stateIf(over.off, true),
    ...shownState(offer, value, over.state),
    selected: offer.chosen(value),
    /* An item with no value keeps its own flag, as a step with none keeps its `current`. */
    ...(over.flag === undefined || value === '' ? {} : { [over.flag]: offer.chosen(value) }),
  }
  return { ...binding, states }
}

/**
 * What an item's set lays over its parts: what the set gives each part, the
 * press that chooses the item, and the host, `selected` while the set
 * chooses it. **An item that presses on its own is in the state its form
 * names** while the set chooses it, as a Button is `pressed`, where its set
 * shows its items as radios or toggle buttons.
 */
export const laidOver = (
  offer: Offer | undefined,
  value: string,
  chooser: string | undefined,
  over: Over & { readonly toggler: string | undefined },
): Record<string, PartBinding> => {
  const laid: Record<string, PartBinding> = { ...offer?.parts?.(value) }
  if (chooser !== undefined) {
    laid[chooser] = onChooser(laid[chooser], offer, value, over)
  } else if (over.toggler !== undefined) {
    /* **An item that opens takes focus and keys on the press that turns
       it**, as an accordion section's trigger. */
    const at = laid[over.toggler]
    laid[over.toggler] = { ...at, view: { ...at?.view, ...over.view } }
  }
  laid.host = onHost(laid.host, offer, value, over)
  return laid
}
