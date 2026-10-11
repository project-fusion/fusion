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
    assignSlot(slot, ...(named.get(slot.name) ?? []))
  }
}

/**
 * Assigns `nodes` to `slot` by hand, unless it already holds exactly them.
 *
 * **An assignment that changes nothing still costs something in WebKit.** It
 * cancels a smooth scroll running in the scroller around the slot, and a track
 * that snaps then returns to where the scroll began. Measured on WebKit 26.6 on
 * October 10, 2026: Carousel assigned its slides on every update, so a press of
 * next moved the dots and left the slides where they were. Chromium carries on
 * scrolling.
 */
export const assignSlot = (slot: HTMLSlotElement, ...nodes: (Element | Text)[]): void => {
  const had = slot.assignedNodes?.() ?? []
  if (had.length !== nodes.length || had.some((one, at) => one !== nodes[at])) {
    slot.assign?.(...nodes)
  }
}
