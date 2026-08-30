/**
 * Takes the pointer for a drag, and carries on if the platform refuses.
 *
 * **Capture is an enhancement, and the drag has to survive losing it.** What it
 * buys is events continuing to arrive once the pointer leaves the target, which
 * matters because a thin divider is easy to outrun. What it costs, called bare,
 * is the rest of the handler: `setPointerCapture` throws `NotFoundError` when
 * the id names no active pointer, and every one of these calls sits above the
 * lines that set the dragging flag and call `preventDefault`. So a refusal did
 * not degrade the drag, it canceled it.
 *
 * That is reachable outside a test: a pointer released between the event being
 * queued and the handler running is gone by the time this is called, and a
 * synthetic `pointerdown` has no active pointer at all.
 *
 * Returns whether it took, for the callers that then ask `hasPointerCapture`
 * before believing a move belongs to them.
 */
export const capturePointer = (target: Element, pointerId: number): boolean => {
  try {
    target.setPointerCapture(pointerId)
    return true
  } catch {
    return false
  }
}
