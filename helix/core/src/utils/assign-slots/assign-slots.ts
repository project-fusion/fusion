/**
 * Sends each child to the slot it names, and every other child to the default
 * slot, in a shadow root that assigns its slots by hand.
 *
 * **A root that assigns by hand routes nothing by itself**, its named slots
 * included, so a header, a footer or an empty state slotted by name reaches
 * nothing unless it is assigned here too. `place` says where a child goes when
 * the host decides it, a row to its list or a card to the slot the layout drew
 * for it, and a child it gives no slot to goes where its `slot` attribute says,
 * as it would under the default assignment.
 *
 * **A slot already holding exactly what it would be given is left alone**, so
 * calling this after every update fires no `slotchange` that nothing changed.
 *
 * Pair it with `ChildrenController`, which calls back when a child arrives
 * after the first render, the case no `slotchange` reports.
 */
export const assignSlots = (
  root: ParentNode | null | undefined,
  children: Iterable<Element>,
  place: (child: Element) => string | undefined = () => undefined,
): void => {
  const named = new Map<string, Element[]>()
  for (const child of children) {
    const name = place(child) ?? child.getAttribute('slot') ?? ''
    named.set(name, [...(named.get(name) ?? []), child])
  }
  for (const slot of root?.querySelectorAll?.<HTMLSlotElement>('slot') ?? []) {
    const wanted = named.get(slot.name) ?? []
    const had = slot.assignedNodes()
    if (had.length !== wanted.length || had.some((one, at) => one !== wanted[at])) {
      slot.assign?.(...wanted)
    }
  }
}
