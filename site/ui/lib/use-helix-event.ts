'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * Binds a Helix event to an element, without going through a React prop.
 *
 * **`onhelix-*` does not survive hydration.** React records the prop and
 * attaches no listener, so on a server-rendered page every Helix event handler
 * is dead: the element does its own job, the consumer's callback never runs,
 * and nothing is logged. It repairs itself the moment React commits an update
 * for any other reason, which is why it looks like it works while developing
 * and fails on a page someone actually loaded.
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
 */
export function useHelixEvent<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
  target: RefObject<E | null>,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): void {
  const held = useRef(listener)
  held.current = listener

  useEffect(() => {
    const node = target.current
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
