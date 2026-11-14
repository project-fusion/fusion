/** What a press on a field, a list box or editable text uses the drag for. */
const EDITABLE = 'input, select, textarea, [contenteditable]:not([contenteditable="false"])'

/**
 * Whether a press may start swiping a drawer away.
 *
 * Not a mouse, which drags to select text. Not a press on a field or on
 * editable text, which drags to move its caret. A press inside a list that
 * scrolls along the swipe may, and `listAt` names the list, whose drag the
 * drawer takes only as `DrawerHandOff` says.
 */
export const startsSwipe = (target: Element, pointerType: string): boolean =>
  pointerType !== 'mouse' && target.closest(EDITABLE) === null

/**
 * Whether a press landed on the scrim: on the panel's own `<dialog>` and
 * outside its box, where a browser draws its `::backdrop`. The scrim takes a
 * press that dismisses the drawer, and a drag there moves nothing, as on a
 * phone, where the scrim is a view of its own under the panel.
 */
export const onScrim = (
  target: Element,
  panel: Element | null | undefined,
  at: { readonly clientX: number; readonly clientY: number },
): boolean => {
  if (panel === null || panel === undefined || target !== panel) {
    return false
  }
  const box = panel.getBoundingClientRect()
  return (
    at.clientX < box.left ||
    at.clientX > box.right ||
    at.clientY < box.top ||
    at.clientY > box.bottom
  )
}

/**
 * The scroller a press landed in where it scrolls along the swipe, so the
 * drag is its own until it hands it over, and nothing where the press is
 * outside it or it does not scroll that way. **Read from the press's path**,
 * since what the drawer holds is passed in and is no descendant of the
 * scroller its shadow root draws.
 */
export const listAt = (
  path: readonly EventTarget[],
  axis: 'x' | 'y',
  scroller: Element | null | undefined,
): Element | undefined => {
  if (!scroller || !path.includes(scroller)) {
    return undefined
  }
  const scrolls =
    axis === 'x'
      ? scroller.scrollWidth > scroller.clientWidth
      : scroller.scrollHeight > scroller.clientHeight
  return scrolls ? scroller : undefined
}
