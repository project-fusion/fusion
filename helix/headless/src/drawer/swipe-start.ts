/** What a press on a field, a list box or editable text uses the drag for. */
const EDITABLE = 'input, select, textarea, [contenteditable]:not([contenteditable="false"])'

/**
 * Whether a press may start swiping a drawer away.
 *
 * Not a mouse, which drags to select text. Not a press on a field or on
 * editable text, which drags to move its caret. And not a press inside a
 * scroller that can scroll along the swipe, which drags to scroll, so a bottom
 * sheet holding a long list scrolls the list.
 */
export const startsSwipe = (
  target: Element,
  pointerType: string,
  axis: 'x' | 'y',
  scroller: Element | null | undefined,
): boolean => {
  if (pointerType === 'mouse' || target.closest(EDITABLE)) {
    return false
  }
  if (!scroller || !(scroller === target || scroller.contains(target))) {
    return true
  }
  return axis === 'x'
    ? scroller.scrollWidth <= scroller.clientWidth
    : scroller.scrollHeight <= scroller.clientHeight
}
