/** The least a thing must be for this to pick one of them. */
export interface ActivatableItem {
  /** Whether it can be the current one. A disabled item is skipped. */
  disabled?: boolean
  /** What identifies it, and what the value is compared against. */
  value: string
}

/**
 * Which item a value names, or the first that could stand in for it.
 *
 * `items.find(match) ?? items[0]` was written by hand in four components and it
 * is not the obvious line it looks like. It is what makes a set whose `value`
 * names nothing still show something, which is every set before its consumer
 * has chosen and every set whose current item has just been removed.
 *
 * The fallback skips disabled items and the match does not. A consumer who
 * names a disabled item meant it, and quietly moving to another would be the
 * component overruling them; but falling back *onto* a disabled item is the
 * component choosing, and it should not choose something out of play. Every
 * hand-written copy took `items[0]` either way, so a set opening on a disabled
 * first item showed it as current.
 *
 * A plain function rather than only a method on `MixinControllerActive`,
 * because the components that need it are split across two mixins: a set whose
 * value is submitted takes `MixinControllerValue` and cannot also take the
 * active one without two properties called `value`.
 */
export const resolveActiveItem = <Item extends ActivatableItem>(
  value: string,
  items: Item[],
): Item | undefined =>
  items.find((item) => item.value === value) ?? items.find((item) => !item.disabled)
