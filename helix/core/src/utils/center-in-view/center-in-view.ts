/**
 * Scrolls `box` to put `item`, one of the things it scrolls, in its middle.
 *
 * For a list read as a dial rather than scanned, as Time Picker's wheels read
 * a Listbox. A delta from the two boxes rather than `offsetTop`: a slotted
 * item's `offsetParent` is whatever is positioned above it, which is not the
 * box and is not guaranteed to be anything.
 *
 * **Twice, and the second pass is not superstition.** The first delta is
 * computed against whatever layout is current when this is called, and inside
 * a panel that has just been revealed it is a frame behind: measured, one call
 * landed a whole row short, 672 where 704 was wanted, and calling it again
 * from a settled layout put it exactly on center. Reading a rect forces
 * layout, so the second pass sees the result of the first and corrects the
 * remainder. It stops as soon as there is nothing left to correct, and where
 * either box has no height, as on a page not laid out.
 */
export const centerInView = (box: HTMLElement, item: Element): void => {
  for (let pass = 0; pass < 2; pass += 1) {
    const outer = box.getBoundingClientRect()
    const inner = item.getBoundingClientRect()
    if (outer.height === 0 || inner.height === 0) {
      return
    }
    const off = inner.top + inner.height / 2 - (outer.top + outer.height / 2)
    if (Math.abs(off) < 1) {
      return
    }
    box.scrollTop += off
  }
}
