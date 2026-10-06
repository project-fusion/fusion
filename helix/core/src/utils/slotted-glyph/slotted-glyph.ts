/**
 * A glyph a consumer slots once and a component draws in many places: the
 * marks of a rating, the remove icon on every row of a file list.
 *
 * A slotted element can be assigned to one slot only, so a component that
 * draws it in several places draws copies. **One copy per place, kept**, so a
 * render does not make them again: a drag renders on every pointer move, and
 * handing Lit a fresh node each time swaps every copy on every frame.
 */
export class SlottedGlyph {
  /** The copies made so far, by the place each is drawn in. */
  private readonly copies = new Map<string, Node>()

  /** The element slotted last, which every copy is made from. */
  private source: Element | undefined

  /** Whether a glyph is slotted, so the component draws copies of it. */
  get slotted(): boolean {
    return this.source !== undefined
  }

  /**
   * Reads the slot after a `slotchange`: the first element assigned to it,
   * through any slot it is forwarded by. The copies made of the last one go.
   */
  read(slot: HTMLSlotElement): void {
    this.source = slot.assignedElements({ flatten: true })[0]
    this.copies.clear()
  }

  /**
   * The copy for one place, made the first time it is asked for and the same
   * node after, or `undefined` while nothing is slotted.
   */
  copyFor(place: number | string): Node | undefined {
    if (!this.source) {
      return undefined
    }
    const key = String(place)
    let copy = this.copies.get(key)
    if (!copy) {
      copy = this.source.cloneNode(true)
      this.copies.set(key, copy)
    }
    return copy
  }
}
