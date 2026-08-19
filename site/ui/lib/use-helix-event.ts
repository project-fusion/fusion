'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

/**
 * Binds a Helix event to an element, without going through a React prop.
 *
 * **No longer required, as of 19 Aug 2026.** `HelixElement.dispatchEvent` now
 * binds the handler React is holding on the node before it announces anything,
 * so `onhelix-*` in plain JSX survives hydration on its own. This stays for the
 * case below, where the element can change under a ref, and for anyone binding
 * an event on something that is not a Helix element.
 *
 * **What it was written for: `onhelix-*` did not survive hydration.** React
 * records the prop and attaches no listener, so on a server-rendered page every
 * Helix event handler was dead: the element did its own job, the consumer's
 * callback never ran, and nothing was logged. It repaired itself the moment
 * React committed an update for any other reason, which is why it looked like it
 * worked while developing and failed on a page someone actually loaded.
 *
 * Measured on the sandbox against React 19.2.8. Hydrated, a click on a file tab
 * moved the tab and left `pane` at its initial value, and dispatching the event
 * directly on the host reached nothing either, which is what shows there is no
 * listener rather than a listener that ignored it. Navigating away and back so
 * the same component *mounted* instead of hydrating, the first click worked.
 *
 * An effect runs on mount and on hydration alike, so this binds in both. The
 * listener is held in a ref and read at call time, so an inline arrow function
 * does not tear down and re-add the listener on every render.
 *
 * The `on*` prop is still right for anything React itself dispatches, native
 * events included: `onClick` on a `<helix-button>` goes through React's own
 * system, which hydration does set up.
 *
 * **Pass an element rather than a ref where the element can change.** A
 * `RefObject` cannot tell anyone that its `.current` moved, so the effect below
 * binds once and stays bound to whatever was there at mount, detached or not.
 * The sandbox rendered its examples tree in an `<aside>` on a wide viewport and
 * in a `<helix-drawer>` on a narrow one, both carrying the same ref: on a
 * phone, the first commit bound the aside's tree, the media query then swapped
 * in the drawer's, and every row in it was dead. Measured, an event dispatched
 * straight at the live tree reached nothing.
 *
 * `useElementRef` is the fix at the call site. It holds the node in state, so
 * the element itself is a dependency and swapping it rebinds.
 */
export function useHelixEvent<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
  target: E | RefObject<E | null> | null,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): void {
  const held = useRef(listener)
  held.current = listener

  useEffect(() => {
    /* An element is its own dependency, so a swap rebinds. A ref is a stable
       object whose contents this cannot see, which is the older form and is
       still correct where the element never changes. */
    const node = target === null ? null : target instanceof HTMLElement ? target : target.current
    if (!node) {
      return
    }
    const handle = (event: HTMLElementEventMap[K]): void => {
      held.current(event)
    }
    node.addEventListener(type, handle)
    return () => node.removeEventListener(type, handle)
  }, [target, type])
}

/**
 * Holds an element in state, for a ref whose element can change.
 *
 * `ref={setNode}` rather than `ref={someRef}`. React calls a function ref with
 * the node on attach and with `null` on detach, so state follows the element
 * and anything depending on it re-runs. The setter from `useState` is stable,
 * so this does not detach and reattach on every render the way an inline arrow
 * would.
 *
 * Only needed where an element is conditionally rendered or swapped between two
 * places. A ref is still right for an element that mounts once and stays.
 */
export function useElementRef<E extends HTMLElement>(): [E | null, (node: E | null) => void] {
  return useState<E | null>(null)
}
