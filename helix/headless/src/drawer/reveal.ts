/**
 * Whether a box reaches past the window's edges, by more than a pixel.
 *
 * What a drawer resting at a snap point asks of the element focus has just
 * moved to: the part of the panel past the window's edge is off screen, and a
 * control there has focus where the reader cannot see it.
 */
export const beyondWindow = (
  box: Pick<DOMRectReadOnly, 'bottom' | 'left' | 'right' | 'top'>,
  width: number,
  height: number,
): boolean => box.top < -1 || box.left < -1 || box.bottom > height + 1 || box.right > width + 1
