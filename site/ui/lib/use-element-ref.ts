'use client'

import { useState } from 'react'

/**
 * Holds an element in state, for when the element itself is a dependency.
 *
 * `ref={setNode}` rather than `ref={someRef}`. React calls a function ref with
 * the node on attach and with `null` on detach, so state follows the element
 * and anything depending on it re-runs. The setter from `useState` is stable,
 * so this does not detach and reattach on every render the way an inline arrow
 * would.
 *
 * **This outlived what it was written for.** It came with `useHelixEvent`,
 * whose problem was that a `RefObject` cannot tell a listener-binding effect
 * that its `.current` moved: the sandbox rendered its examples tree in an
 * `<aside>` on a wide viewport and in a `<helix-drawer>` on a narrow one, and
 * every row in the drawer was dead. Event handlers are props now, and React
 * binds whichever element it rendered, so that problem is gone and the hook it
 * came with is deleted.
 *
 * What is left is the general case: an effect or a memo that needs the element
 * as a value. The sandbox observes its splitter's width with a `ResizeObserver`
 * and reads the tree's rows through a `useCallback`, and both must re-run when
 * the element arrives, which a ref cannot announce. Use it for that, and a
 * plain `useRef` for an element you only ever reach into.
 */
export function useElementRef<E extends HTMLElement>(): [E | null, (node: E | null) => void] {
  return useState<E | null>(null)
}
