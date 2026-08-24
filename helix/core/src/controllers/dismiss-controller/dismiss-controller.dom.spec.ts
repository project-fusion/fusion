import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { DismissController } from './dismiss-controller.js'

/**
 * Closing an overlay on Escape or on a press outside it.
 *
 * Both, because they are different intentions with the same meaning: Escape is
 * the keyboard's way out and clicking away is the pointer's, and an overlay
 * honouring only one is one half its readers cannot dismiss.
 *
 * **The case worth the most here is two overlays open at once.** Every one of
 * them listens on `document`, so they are siblings on a single node and the
 * only ordering is registration, which is the order they *opened* rather than
 * the order they are nested in. `stopPropagation` stops an event reaching
 * ancestors and does nothing between siblings, so one Escape ran all of them
 * under a comment claiming the innermost was the one the reader meant.
 */
beforeAll(() => {
  registerDom()
})

/* Released whatever the test did: `activate` puts listeners on `document` and
   `window`, and one left behind answers every press in every test after it. */
const live: DismissController[] = []
afterEach(() => {
  for (const one of live.splice(0)) {
    one.deactivate()
  }
})

interface Overlay {
  asked: number
  host: HTMLElement
  dismiss: DismissController
}

const overlay = (
  into: ParentNode = document.body,
  boundary?: DismissOptions['boundary'],
): Overlay => {
  const host = document.createElement('div')
  Object.assign(host, { addController: () => {} })
  into.append(host)
  const made: Overlay = {
    asked: 0,
    dismiss: new DismissController(host as never, {
      ...(boundary ? { boundary } : {}),
      onDismiss: () => {
        made.asked += 1
      },
    }),
    host,
  }
  live.push(made.dismiss)
  return made
}

type DismissOptions = ConstructorParameters<typeof DismissController>[1]

const press = (key: string): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

const pointerAt = (target: EventTarget): void => {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
}

describe('Escape', () => {
  test('closes the overlay', () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    press('Escape')
    expect(one.asked).toBe(1)
  })

  test('and nothing else does', () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    press('Enter')
    press('a')
    expect(one.asked).toBe(0)
  })
})

describe('Escape with more than one overlay open', () => {
  /* Nested through a shadow boundary as well as through the tree, since that is
     how an overlay inside a component is actually arranged and
     `document.activeElement` cannot see through one either. */
  const nested = (): { inner: Overlay; outer: Overlay } => {
    document.body.innerHTML = ''
    const outer = overlay()
    const root = outer.host.attachShadow({ mode: 'open' })
    return { inner: overlay(root), outer }
  }

  test('closes the innermost, and only that one', () => {
    const { inner, outer } = nested()
    outer.dismiss.activate()
    inner.dismiss.activate()
    press('Escape')
    expect([inner.asked, outer.asked]).toEqual([1, 0])
  })

  /* The half that made this a depth rather than a flag. Listeners on `document`
     run in registration order, which is the order the overlays opened, and an
     overlay can perfectly well be opened from inside one that is already open
     or the other way round. */
  test('whichever of them opened first', () => {
    const { inner, outer } = nested()
    inner.dismiss.activate()
    outer.dismiss.activate()
    press('Escape')
    expect([inner.asked, outer.asked]).toEqual([1, 0])
  })

  test('and the next Escape closes the one now innermost', () => {
    const { inner, outer } = nested()
    outer.dismiss.activate()
    inner.dismiss.activate()
    press('Escape')
    inner.dismiss.deactivate()
    press('Escape')
    expect([inner.asked, outer.asked]).toEqual([1, 1])
  })

  /* Two overlays that are siblings rather than nested are both at the same
     depth, and the marker is `>=`, so the first to run takes it. Neither is
     inside the other, so there is no better answer available. */
  test('taking exactly one where neither is inside the other', () => {
    document.body.innerHTML = ''
    const first = overlay()
    const second = overlay()
    first.dismiss.activate()
    second.dismiss.activate()
    press('Escape')
    expect(first.asked + second.asked).toBe(1)
  })
})

describe('a press outside', () => {
  test('closes the overlay', () => {
    document.body.innerHTML = '<p id="elsewhere">elsewhere</p>'
    const one = overlay()
    one.dismiss.activate()
    pointerAt(document.getElementById('elsewhere') as HTMLElement)
    expect(one.asked).toBe(1)
  })

  /* `composedPath` rather than `target`, so a press inside the overlay's own
     shadow root is still recognized as inside it. */
  test('while one inside its shadow root does not, which `target` alone cannot see', () => {
    document.body.innerHTML = ''
    const one = overlay()
    const root = one.host.attachShadow({ mode: 'open' })
    root.innerHTML = '<button id="inner">ok</button>'
    one.dismiss.activate()
    pointerAt(root.getElementById('inner') as HTMLElement)
    expect(one.asked).toBe(0)
  })

  /* An overlay's own scrim is usually inside its shadow root, and a press on the
     scrim is exactly what "outside" means to a reader. Measured against the
     host, that press is inside the composed path and the overlay never closes. */
  test('and the boundary is the panel rather than the host, for the scrim’s sake', () => {
    document.body.innerHTML = ''
    let panel: Element | null = null
    const one = overlay(document.body, () => panel)
    const root = one.host.attachShadow({ mode: 'open' })
    root.innerHTML = '<div id="scrim"></div><div id="panel"></div>'
    panel = root.getElementById('panel')
    one.dismiss.activate()
    pointerAt(root.getElementById('scrim') as HTMLElement)
    expect(one.asked).toBe(1)
  })

  /* A control is not always one element: a popover opened by an invoker
     elsewhere on the page has that invoker as part of it. Treating it as
     outside closed the panel on `pointerdown` and the invoker's own `--toggle`
     reopened it on the `click` that followed, so the panel could never be
     closed by the button that opened it. */
  test('unless it landed on something else the overlay counts as itself', () => {
    document.body.innerHTML = '<button id="invoker">open</button>'
    const invoker = document.getElementById('invoker') as HTMLElement
    let host: HTMLElement | undefined
    const one = overlay(document.body, () => [host as Element, invoker])
    host = one.host
    one.dismiss.activate()
    pointerAt(invoker)
    expect(one.asked).toBe(0)
  })

  test('and a boundary that has not rendered yet is simply not one', () => {
    document.body.innerHTML = '<p id="elsewhere">elsewhere</p>'
    const one = overlay(document.body, () => [null, undefined])
    one.dismiss.activate()
    pointerAt(document.getElementById('elsewhere') as HTMLElement)
    expect(one.asked).toBe(1)
  })
})

describe('a press inside a frame', () => {
  /* The frame swallows the event, so the document owning the overlay never sees
     a `pointerdown`, and where the frame is cross-origin there is nothing to
     listen to inside it either. What is observable is that the window lost
     focus and a frame on this page gained it. */
  const blur = async (): Promise<void> => {
    window.dispatchEvent(new Event('blur'))
    await new Promise((done) => setTimeout(done, 0))
  }

  /* **Put back afterwards, and the whole suite is why.** `activeElement` is a
     getter on the prototype, so this shadows it with an own property, and bun
     runs every DOM spec in one process: left in place it answers a fixed
     `<iframe>` for every file that runs after this one. Each of these passed
     alone and six focus-trap tests failed in the full run, which is the one
     shape of failure a per-file run can never show. */
  const focused = (tagName: string | null): void => {
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      value: tagName === null ? null : document.createElement(tagName),
    })
  }

  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).activeElement
  })

  test('closes the overlay, being the one press the document cannot see', async () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    focused('iframe')
    await blur()
    expect(one.asked).toBe(1)
  })

  /* Leaving the browser altogether blurs the window too, so what took focus is
     the part that distinguishes them. An overlay that closed on every blur
     would close whenever the reader alt-tabbed away and back. */
  test('where leaving the browser entirely does not', async () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    focused(null)
    await blur()
    expect(one.asked).toBe(0)
  })

  /* Deferred by a task, because the order of `blur` against focus moving is not
     something every browser agrees on. The guard is for the overlay having
     closed for another reason in between, which would otherwise dismiss
     whatever opened next. */
  test('and one that closed while the task was pending is not asked again', async () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    focused('iframe')
    window.dispatchEvent(new Event('blur'))
    one.dismiss.deactivate()
    await new Promise((done) => setTimeout(done, 0))
    expect(one.asked).toBe(0)
  })
})

describe('an overlay that is not open', () => {
  test('hears nothing', () => {
    document.body.innerHTML = '<p id="elsewhere">elsewhere</p>'
    const one = overlay()
    press('Escape')
    pointerAt(document.getElementById('elsewhere') as HTMLElement)
    expect(one.asked).toBe(0)
  })

  test('and one closed again hears nothing either', () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    one.dismiss.deactivate()
    press('Escape')
    expect(one.asked).toBe(0)
  })

  /* A host removed from the page rather than closed, which would otherwise
     leave document-level listeners behind for good. */
  test('as does one whose host has gone', () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    one.dismiss.hostDisconnected()
    press('Escape')
    expect(one.asked).toBe(0)
  })
})

describe('opening an overlay that is already open', () => {
  test('does not double every press it hears', () => {
    document.body.innerHTML = ''
    const one = overlay()
    one.dismiss.activate()
    one.dismiss.activate()
    press('Escape')
    expect(one.asked).toBe(1)
  })
})
