/**
 * What one item of a set that mixes commands and choices is, as a menu's
 * rows are: a command, a choice that turns on and off, or one of a run of
 * which one is on. The web's Menu Item and a phone's mixed set both read it.
 */

/** What a mixed set's item says of itself. */
export interface MixedItem {
  /** Whether it is a choice that turns on and off, where it is not checked yet. */
  readonly checkable: boolean
  /** Whether it is checked. */
  readonly checked: boolean
  /** Whether it is one of a run of which one is checked. */
  readonly exclusive: boolean
}

/** What kind of item it is. */
export type ItemKind = 'checkable' | 'command' | 'exclusive'

/** The role an item's kind takes. */
export type ItemRole = 'menuitem' | 'menuitemcheckbox' | 'menuitemradio'

/**
 * The item's kind. **`exclusive` makes an item one of a run**, and
 * `checkable` or `checked` makes it a choice of its own, so an item that is
 * on, or one of a run, never has to say both. Any other item is a command.
 */
export const kindOf = (item: MixedItem): ItemKind => {
  if (item.exclusive) {
    return 'exclusive'
  }
  return item.checkable || item.checked ? 'checkable' : 'command'
}

const ROLES: Readonly<Record<ItemKind, ItemRole>> = {
  checkable: 'menuitemcheckbox',
  command: 'menuitem',
  exclusive: 'menuitemradio',
}

/** The role of an item of `kind`: `menuitemradio` for one of a run, and `menuitemcheckbox` for a choice. */
export const roleOf = (kind: ItemKind): ItemRole => ROLES[kind]

/** What `aria-checked` says of the item: `true` or `false` for a choice, and nothing for a command. */
export const checkedStateOf = (item: MixedItem): 'false' | 'true' | null =>
  kindOf(item) === 'command' ? null : item.checked ? 'true' : 'false'

/**
 * What a press on the item turns it to, or `undefined` where it stays as it
 * is. **A choice turns over, and an item of a run only turns on**: a press
 * on the one that is checked leaves it checked. A command never turns.
 */
export const nextChecked = (item: MixedItem): boolean | undefined => {
  switch (kindOf(item)) {
    case 'command':
      return undefined
    case 'exclusive':
      return item.checked ? undefined : true
    default:
      return !item.checked
  }
}

/**
 * The other members of the run the item at `at` stands in among `siblings`:
 * the siblings next to it on each side, up to the first that `inRun` refuses,
 * such as a divider, nearest first, those before it then those after it. An
 * item outside a run stands in none.
 */
export const runAround = <Sibling>(
  siblings: readonly Sibling[],
  at: number,
  inRun: (sibling: Sibling) => boolean,
): Sibling[] => {
  const self = siblings[at]
  if (self === undefined || !inRun(self)) {
    return []
  }
  const peers: Sibling[] = []
  for (const step of [-1, 1]) {
    for (let next = at + step; next >= 0 && next < siblings.length; next += step) {
      const sibling = siblings[next] as Sibling
      if (!inRun(sibling)) {
        break
      }
      peers.push(sibling)
    }
  }
  return peers
}
