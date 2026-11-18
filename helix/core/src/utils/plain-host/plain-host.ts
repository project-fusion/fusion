import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** A controller running over an element, and how to take it off again. */
export interface Running<C extends ReactiveController> {
  /** The controller. */
  readonly controller: C
  /** Tells the controller the element has updated, as a component's update would. */
  updated(): void
  /** Disconnects the controller, and takes back what was lent once nothing else holds the element. */
  release(): void
}

/** The members a controller asks of its host and a plain element lacks. */
const MEMBERS = ['addController', 'removeController', 'requestUpdate', 'updateComplete'] as const

/** What is lent to one plain element, shared by every controller running over it. */
interface Lent {
  controllers: Set<ReactiveController>
  draws: Map<ReactiveController, () => void>
}

const lent = new WeakMap<HTMLElement, Lent>()

/** Set while a controller is being made, so the `addController` it calls knows which run it belongs to. */
let making: ((one: ReactiveController) => void) | undefined

/** Sets the four members on a plain element, once, and returns what they share. */
const lend = (element: HTMLElement): Lent => {
  const known = lent.get(element)
  if (known) {
    return known
  }
  const made: Lent = { controllers: new Set(), draws: new Map() }
  lent.set(element, made)
  const members: Record<(typeof MEMBERS)[number], unknown> = {
    addController: (one: ReactiveController) => {
      made.controllers.add(one)
      making?.(one)
      if (element.isConnected) {
        one.hostConnected?.()
      }
    },
    removeController: (one: ReactiveController) => {
      made.controllers.delete(one)
      made.draws.delete(one)
    },
    requestUpdate: () => {
      for (const draw of made.draws.values()) {
        draw()
      }
    },
    updateComplete: Promise.resolve(true),
  }
  for (const name of MEMBERS) {
    Object.defineProperty(element, name, {
      configurable: true,
      enumerable: false,
      value: members[name],
      writable: true,
    })
  }
  return made
}

/** Takes the four members back off a plain element that no controller holds. */
const unlend = (element: HTMLElement, record: Lent): void => {
  if (record.controllers.size > 0) {
    return
  }
  lent.delete(element)
  for (const name of MEMBERS) {
    delete (element as unknown as Record<string, unknown>)[name]
  }
}

/** Whether the element is a host of its own, as a Lit element is. */
const isHost = (element: HTMLElement): element is ReactiveControllerHost & HTMLElement =>
  !lent.has(element) &&
  typeof (element as Partial<ReactiveControllerHost>).addController === 'function'

/**
 * Runs a controller over an element the page wrote, such as a `<ul>`, with no
 * component around it.
 *
 * **A controller asks four members of its host, and the element for the
 * rest.** It observes, measures and animates its host as the element it is,
 * so the host has to be the element itself: a wrapper object fails every
 * `MutationObserver`, `ResizeObserver` and `getComputedStyle` call. The four,
 * `addController`, `removeController`, `requestUpdate` and `updateComplete`,
 * are set on the element, unlisted, while a controller runs over it, and taken
 * off when the last one is released.
 *
 * **An element that is a host already is used as it is**, so a Lit element
 * keeps its own members and its own lifecycle runs the controller. Lit
 * connects a controller added to a connected host at once, as this does.
 *
 * `draw` runs where the controller asks for an update, as a count does each
 * frame, in place of the render a component would do.
 */
export const runOn = <C extends ReactiveController>(
  element: HTMLElement,
  make: (host: ReactiveControllerHost & HTMLElement) => C,
  draw?: () => void,
): Running<C> => {
  if (isHost(element)) {
    const host = element
    const controller = make(host)
    const own = draw ? { hostUpdated: draw } : undefined
    if (own) {
      host.addController(own)
    }
    return {
      controller,
      release: () => {
        controller.hostDisconnected?.()
        host.removeController(controller)
        if (own) {
          host.removeController(own)
        }
      },
      updated: () => controller.hostUpdated?.(),
    }
  }
  const record = lend(element)
  let mine: ReactiveController | undefined
  making = (one) => {
    mine ??= one
  }
  let controller: C
  try {
    controller = make(element as ReactiveControllerHost & HTMLElement)
  } finally {
    making = undefined
  }
  const owned = mine ?? controller
  if (draw) {
    record.draws.set(owned, draw)
  }
  return {
    controller,
    release: () => {
      if (!record.controllers.has(owned)) {
        return
      }
      controller.hostDisconnected?.()
      record.controllers.delete(owned)
      record.draws.delete(owned)
      unlend(element, record)
    },
    updated: () => controller.hostUpdated?.(),
  }
}

/**
 * A time or a curve for a function's options, read when a move starts.
 *
 * A number is milliseconds, a name that starts with `--` is a custom property
 * read off the element, such as a token, and anything else is written as it
 * is. Left out, it is `token`.
 *
 * **A custom property the page does not define reads as `standing`**, the
 * value the token holds in Helix's own stylesheet, so a page that calls a
 * function without that stylesheet still moves. Under reduced motion the
 * stylesheet shortens the time tokens to almost nothing, and each controller
 * checks the reader's setting itself as well.
 */
export const readTiming = (
  element: Element,
  value: number | string | undefined,
  token: string,
  standing: string,
): string => {
  if (typeof value === 'number') {
    return `${value}ms`
  }
  const written = value ?? token
  if (!written.startsWith('--')) {
    return written
  }
  return getComputedStyle(element).getPropertyValue(written).trim() || standing
}
