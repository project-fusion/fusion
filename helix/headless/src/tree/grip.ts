/**
 * Whether an event began on an item's grip, in a `reorderable` tree. The grip
 * is the tree's: a press there neither chooses the row nor follows its link.
 */
export const fromGrip = (event: Event): boolean =>
  Boolean((event.composedPath()[0] as Element | undefined)?.closest?.('[part="grip"]'))
