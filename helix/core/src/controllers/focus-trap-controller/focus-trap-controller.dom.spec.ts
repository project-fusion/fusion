import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { FocusTrapController } from './focus-trap-controller.js'

/**
 * Keeping Tab inside a container while it is open, and giving focus back after.
 *
 * A dialog that does not trap focus is one a keyboard reader tabs straight out
 * of, into a page they cannot see and cannot get back from. Restoring focus on
 * release matters as much: without it, closing a drawer drops them at the top
 * of the document.
 *
 * **The bug worth holding on to is the one about hosts.** `focusableElements`
 * returns hosts, so a `helix-button` delegating focus is what the list holds
 * while `deepActiveElement` returns the `<button>` in its shadow root. Those are
 * never equal and the container never `contains` the second, so an identity
 * check read "outside the trap" on every element: shift-Tab jumped to the last
 * item from anywhere and forward Tab never wrapped at all. A trap that leaks in
 * one direction and cannot be walked backwards in the other.
 */
beforeAll(() => {
  registerDom()
})

/** A minimal Lit host: the controller only ever calls `addController`. */
const host = () => ({ addController: () => {} }) as never

/* Released whatever the test did, because `activate` puts a capturing listener
   on the *document* and a test that fails before its own `deactivate` would
   leave it there, trapping every test after it against a container that is no
   longer on the page. That happened while writing this: one real failure
   produced a second, and the second said nothing about the code. */
let live: FocusTrapController | undefined
afterEach(() => {
  live?.deactivate()
  live = undefined
})

const scene = (
  markup: string,
): { container: HTMLElement; outside: HTMLElement; trap: FocusTrapController } => {
  document.body.innerHTML = `<button id="outside">before</button><div id="trap">${markup}</div>`
  live = new FocusTrapController(host())
  return {
    container: document.getElementById('trap') as HTMLElement,
    outside: document.getElementById('outside') as HTMLElement,
    trap: live,
  }
}

/** A Tab the document hears, as the controller listens for it: capturing. */
const tab = (shiftKey = false): boolean => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
  Object.defineProperty(event, 'shiftKey', { value: shiftKey })
  document.dispatchEvent(event)
  return event.defaultPrevented
}

const id = (): string | undefined => (document.activeElement as HTMLElement | null)?.id

describe('tabbing forward off the end', () => {
  test('wraps to the first item rather than leaving', () => {
    const { container, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    trap.activate(container)
    ;(document.getElementById('b') as HTMLElement).focus()
    expect(tab()).toBe(true)
    expect(id()).toBe('a')
  })

  test('and leaves the middle of the set alone, which is the platform’s job', () => {
    const { container, trap } = scene(
      '<button id="a">a</button><button id="b">b</button><button id="c">c</button>',
    )
    trap.activate(container)
    ;(document.getElementById('a') as HTMLElement).focus()
    expect(tab()).toBe(false)
  })
})

describe('tabbing backward off the front', () => {
  test('wraps to the last item', () => {
    const { container, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    trap.activate(container)
    ;(document.getElementById('a') as HTMLElement).focus()
    expect(tab(true)).toBe(true)
    expect(id()).toBe('b')
  })
})

describe('focus that is outside the trap entirely', () => {
  /* -1 from `findIndex` wraps to whichever end the reader was heading for,
     which is the outside-entirely case falling out of the index for free. */
  test('is pulled to the first item on Tab', () => {
    const { container, outside, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    trap.activate(container)
    outside.focus()
    expect(tab()).toBe(true)
    expect(id()).toBe('a')
  })

  test('and to the last on shift-Tab', () => {
    const { container, outside, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    trap.activate(container)
    outside.focus()
    tab(true)
    expect(id()).toBe('b')
  })
})

describe('a container holding an element that delegates focus', () => {
  /* The regression above, as the thing that produced it: the list holds the
     host and the active element is the control in its shadow root, so an
     identity check sees every element as outside. */
  test('knows the host holds focus even though the shadow control has it', () => {
    const { container, trap } = scene('<div id="a"></div><button id="b">b</button>')
    const delegating = document.getElementById('a') as HTMLElement
    const root = delegating.attachShadow({ delegatesFocus: true, mode: 'open' })
    /* Declared rather than requested. happy-dom accepts the option and reports
       `delegatesFocus` as false, so the host never enters the focusable list
       and the very case under test cannot be arranged. The flag is the input to
       the decision; the rest of the mechanism, `deepActiveElement` reaching
       into the shadow root and `deepContains` crossing back out, is happy-dom's
       own and is exercised for real. */
    Object.defineProperty(root, 'delegatesFocus', { value: true })
    root.innerHTML = '<button id="inner">inner</button>'
    trap.activate(container)
    ;(root.getElementById('inner') as HTMLElement).focus()
    /* Forward from the first of two is the platform's move, so a trap that
       thought this was outside would have wrapped to the front instead. */
    expect(tab()).toBe(false)
  })
})

describe('a container with nothing focusable in it', () => {
  test('keeps focus where it is rather than letting Tab escape behind it', () => {
    const { container, trap } = scene('<p>nothing to focus</p>')
    trap.activate(container)
    expect(tab()).toBe(true)
  })
})

describe('releasing the trap', () => {
  test('gives focus back to wherever it came from', () => {
    const { container, outside, trap } = scene('<button id="a">a</button>')
    outside.focus()
    trap.activate(container)
    ;(document.getElementById('a') as HTMLElement).focus()
    trap.deactivate()
    expect(id()).toBe('outside')
  })

  test('and stops answering Tab at all', () => {
    const { container, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    trap.activate(container)
    trap.deactivate()
    ;(document.getElementById('b') as HTMLElement).focus()
    expect(tab()).toBe(false)
  })

  /* A host torn down while trapping is a dialog removed from the page rather
     than closed, which is the case that would otherwise leave a document-level
     capturing listener behind forever. */
  test('which is also what happens when the host goes away', () => {
    const { container, outside, trap } = scene('<button id="a">a</button>')
    outside.focus()
    trap.activate(container)
    trap.hostDisconnected()
    expect(id()).toBe('outside')
  })
})

describe('taking the trap', () => {
  test('moves focus to the first item, after the render that drew it', async () => {
    const { container, outside, trap } = scene('<button id="a">a</button><button id="b">b</button>')
    outside.focus()
    trap.activate(container)
    await new Promise((done) => requestAnimationFrame(done))
    expect(id()).toBe('a')
  })

  /* A container with nothing in it still has to take focus, or the reader is
     left on the page behind a surface they cannot see. */
  test('or to the container itself where there is nothing in it', async () => {
    const { container, outside, trap } = scene('<p>nothing</p>')
    container.tabIndex = -1
    outside.focus()
    trap.activate(container)
    await new Promise((done) => requestAnimationFrame(done))
    expect(id()).toBe('trap')
  })
})

describe('a key that is not Tab', () => {
  test('is not this controller’s business', () => {
    const { container, trap } = scene('<button id="a">a</button>')
    trap.activate(container)
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'a' })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
