/**
 * Calls `then` once `ready` answers yes: at once if it already does, and
 * otherwise on the first change to the tree under `root` after which it does.
 *
 * What a tour's `wait` stop rests on: the tour waits for the element the stop
 * names to be on the page, such as a menu the reader has to open, and moves on
 * by itself. Returns a function that stops waiting.
 */
export const waitFor = (root: Node, ready: () => boolean, then: () => void): (() => void) => {
  if (ready()) {
    then()
    return () => {}
  }
  if (typeof MutationObserver === 'undefined') {
    return () => {}
  }
  const watcher = new MutationObserver(() => {
    if (ready()) {
      watcher.disconnect()
      then()
    }
  })
  watcher.observe(root, { attributes: true, childList: true, subtree: true })
  return () => watcher.disconnect()
}

/** Whether an element is on the page and draws something a reader can see. */
export const onPage = (element: Element | null | undefined): boolean =>
  element?.isConnected === true &&
  (typeof element.getClientRects !== 'function' || element.getClientRects().length > 0)
