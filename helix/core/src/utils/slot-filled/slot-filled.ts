/**
 * Whether a consumer put anything in a slot.
 *
 * **There is no selector for this**, which is why it is script. `slot:empty`
 * looks like the answer and is not: a slot's children are its *fallback*, and
 * assigned nodes are not children, so `:empty` is true whenever the fallback is
 * absent whether or not the consumer slotted anything. `:host(:has(...))` is
 * invalid CSS, and the server has no children to inspect.
 *
 * The answer matters because an empty wrapper is not free. A region that
 * generates a box is a flex item or a grid item whether or not it holds
 * anything, so it takes the container's gap: an announcement with no actions
 * pays the row gap twice. `display: none` is the only fix, because only a box
 * that is not generated has no gap beside it.
 *
 * Text or an element, because neither alone is the test. An element on its own
 * counts a whitespace-only span as content; text on its own counts an icon as
 * nothing.
 *
 * `flatten` is deliberate here, unlike the tooltip's emptiness test: this asks
 * "will anything render", where that one asks "did the consumer provide
 * anything", and a slot showing its fallback does render.
 */
export const slotFilled = (slot: HTMLSlotElement | null | undefined): boolean =>
  (slot?.assignedNodes({ flatten: true }) ?? []).some(
    (node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim() !== '',
  )
