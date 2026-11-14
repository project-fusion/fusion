import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, internalsOf, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

/** Puts back a global a case replaced. */
let restore: (() => void) | undefined

afterEach(() => {
  restore?.()
  restore = undefined
})

const message = async (attributes = ''): Promise<Item> =>
  (await mount(
    `<helix-headless-toast-item ${attributes}>Project saved</helix-headless-toast-item>`,
  )) as Item

/**
 * One message, and the contract that is the message's rather than the region's.
 *
 * **The toast region already proves the arrangement**, which is where messages
 * stack, how many are held and the order they leave in. What one message owns
 * alone is that it goes when it is asked to, so every assertion here is about a
 * message with no region around it: an item that waits to be told is one whose
 * own dismiss control looks broken to anyone who presses it.
 */
describe('one toast message', () => {
  /* Undeclared, the message is its own. It says it is going and then goes, the
     same as Dialog and Accordion, and the consumer still hears it and takes it
     out of their list. */
  test('goes when it is asked to, where nobody claimed it', async () => {
    const host = await message('dismissible')
    let heard = 0
    host.addEventListener('helix-dismiss', () => {
      heard += 1
    })
    expect(host.open).toBe(true)

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(heard).toBe(1)
    expect(host.open).toBe(false)
  })

  /* Declaring `open` seeds the state and does not claim ownership of it.
     Control is an action: it applies, and a consumer refuses to take the
     decision. */
  test('announces and closes, where the markup only seeded it', async () => {
    const host = await message('dismissible open')
    let heard = 0
    host.addEventListener('helix-dismiss', () => {
      heard += 1
    })

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(heard).toBe(1)
    expect(host.open).toBe(false)
  })

  test('and a refused dismissal leaves it open', async () => {
    const host = await message('dismissible open')
    host.addEventListener('helix-dismiss', (event: Event) => {
      event.preventDefault()
    })

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(host.open).toBe(true)
  })

  /* No tone, no mark. "Project saved" is not an error, a warning or an
     announcement, and a glyph there would be decoration standing where meaning
     is supposed to be. Callout falls back to `info` and this deliberately does
     not, which is a difference only a spec on the item can hold. */
  test('draws no mark for a message that means nothing in particular', async () => {
    expect(part(await message(), 'icon')).toBeNull()
    expect(part(await message('tone="danger"'), 'icon')).not.toBeNull()
  })

  /* The duration is published as a custom property rather than drawn, so
     whatever the styled tier does with the remaining time, the message is the
     one that knows how long it has. */
  test('publishes how long it has, and draws no timer where it has forever', async () => {
    const timed = part(await message('duration="4000"'), 'timer')
    expect(timed?.getAttribute('style')).toContain('--toast-duration: 4000ms')
    expect(timed?.getAttribute('aria-hidden')).toBe('true')
    expect(part(await message(), 'timer')).toBeNull()
  })

  /* `duration="3s"` was `NaN` to Lit's number converter, and the countdown
     never starts for `NaN`, so a message meant to go after three seconds
     stayed for good and nothing said why. */
  test('takes its duration as a CSS time, and leaves when it is up', async () => {
    const timed = (await message('duration="3s"')) as Item & { duration?: number }
    expect(timed.duration).toBe(3000)
    expect(part(timed, 'timer')?.getAttribute('style')).toContain('--toast-duration: 3000ms')
    const quick = await message('duration="0.04s"')
    const until = Date.now() + 1200
    while (Date.now() < until && quick.open) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    expect(quick.open).toBe(false)
  })

  test('says once that a duration is not a time, and stays until it is dismissed', async () => {
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (message: string) => warnings.push(message)
    restore = () => {
      console.warn = warn
    }
    const unread = (await message('duration="3 seconds"')) as Item & { duration?: number }
    await message('duration="3 seconds"')
    expect([unread.duration, part(unread, 'timer')]).toEqual([undefined, null])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('duration="3 seconds" is not a time')
  })

  /* A message that arrives in a background tab waits for the reader to come
     back, as React Aria's toast queue does: spent while hidden, it was gone
     before anyone could read it. */
  test('holds its clock while the page is hidden, and runs it again once shown', async () => {
    let hidden = false
    /* The timers capability reads `visibilityState`, as the clock a phone
       runs reads the app's state. */
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hidden ? 'hidden' : 'visible'),
    })
    restore = () => {
      delete (document as unknown as { visibilityState?: string }).visibilityState
    }
    const item = await message('duration="60"')
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((resolve) => setTimeout(resolve, 160))
    expect([item.open, item.hasAttribute('data-paused')]).toEqual([true, true])
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    const until = Date.now() + 1200
    while (Date.now() < until && item.open) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    expect(item.open).toBe(false)
  })

  test('a message moved in the page still goes when its time is up', async () => {
    /* A framework moves nodes for ordinary reasons, and the clock started once,
       in `firstUpdated`: the disconnect stopped it and nothing started it
       again, so a moved message stayed on screen for good. */
    const item = await message('duration="40"')
    const elsewhere = document.createElement('div')
    document.body.append(elsewhere)
    elsewhere.append(item)
    await new Promise((resolve) => setTimeout(resolve, 120))
    await item.updateComplete
    expect(item.open).toBe(false)
  })
})

describe('what a message is to a screen reader', () => {
  test('an alertdialog, and never a live region of its own', async () => {
    const plain = (await mount(
      '<helix-headless-toast-item>Saved</helix-headless-toast-item>',
    )) as Item
    await plain.updateComplete
    expect(internalsOf(plain).role).toBe('alertdialog')
    expect(internalsOf(plain).ariaLive ?? null).toBeNull()
    const danger = (await mount(
      '<helix-headless-toast-item tone="danger">Failed</helix-headless-toast-item>',
    )) as Item
    await danger.updateComplete
    /* The region says it, assertively, once. */
    expect(internalsOf(danger).ariaLive ?? null).toBeNull()
  })

  test('named by its words, where it has no heading', async () => {
    const plain = (await mount(
      '<helix-headless-toast-item>Saved</helix-headless-toast-item>',
    )) as Item
    await plain.updateComplete
    const named = internalsOf(plain).ariaLabelledByElements ?? []
    expect(named.length).toBe(1)
    expect(named[0]).toBe(part(plain, 'content') as Element)
  })

  test('named by its heading and described by its description, where it has them', async () => {
    const item = (await mount(
      `<helix-headless-toast-item>
        <span slot="heading">Upload failed</span>
        <span slot="description">The file is larger than 10 MB.</span>
      </helix-headless-toast-item>`,
    )) as Item
    await item.updateComplete
    const heading = item.querySelector('[slot="heading"]') as Element
    const description = item.querySelector('[slot="description"]') as Element
    expect(internalsOf(item).ariaLabelledByElements?.[0]).toBe(heading)
    expect(internalsOf(item).ariaDescribedByElements?.[0]).toBe(description)
    expect(part(item, 'heading')?.localName).toBe('slot')
    expect(part(item, 'description')?.localName).toBe('slot')
  })
})

describe('a swipe', () => {
  const swipe = (found: Item, dx: number, pointerType = 'touch'): HTMLElement => {
    const box = found.shadowRoot?.querySelector('[part="item"]') as HTMLElement
    box.getBoundingClientRect = () => ({ height: 60, width: 300 }) as DOMRect
    const at = (type: string, x: number, time: number, target: EventTarget): void => {
      const event = new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: 10,
        composed: true,
        pointerId: 5,
        pointerType,
      })
      Object.defineProperty(event, 'timeStamp', { value: time })
      target.dispatchEvent(event)
    }
    at('pointerdown', 0, 0, box)
    at('pointermove', dx, 1000, window)
    return box
  }
  const release = (x: number): void => {
    const event = new PointerEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: x,
      pointerId: 5,
    })
    Object.defineProperty(event, 'timeStamp', { value: 2000 })
    window.dispatchEvent(event)
  }

  test('follows the finger toward the end of the line, and past halfway dismisses', async () => {
    const found = (await mount(
      '<helix-headless-toast-item>Saved</helix-headless-toast-item>',
    )) as Item
    await found.updateComplete
    const box = swipe(found, 200)
    expect(box.style.getPropertyValue('--toast-swipe-x')).toBe('200px')
    release(200)
    await found.updateComplete
    expect(found.open).toBe(false)
  })

  test('short of halfway it goes back, and a mouse moves nothing', async () => {
    const found = (await mount(
      '<helix-headless-toast-item>Saved</helix-headless-toast-item>',
    )) as Item
    await found.updateComplete
    const box = swipe(found, 60)
    release(60)
    await found.updateComplete
    expect(found.open).toBe(true)
    expect(box.style.getPropertyValue('--toast-swipe-x')).toBe('')
    swipe(found, 200, 'mouse')
    expect(box.style.getPropertyValue('--toast-swipe-x')).toBe('')
    release(200)
  })
})

describe('Escape on a message', () => {
  const pressEscape = (target: Element): KeyboardEvent => {
    const key = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Escape',
    })
    target.dispatchEvent(key)
    return key
  }

  test('dismisses the message holding focus, through helix-dismiss', async () => {
    const found = await message('dismissible')
    const heard: string[] = []
    found.addEventListener('helix-dismiss', () => heard.push('dismiss'))
    const key = pressEscape(found)
    await found.updateComplete
    expect(heard).toEqual(['dismiss'])
    expect(key.defaultPrevented).toBe(true)
    expect(found.open).toBe(false)
  })

  test('a refused dismissal leaves the message, and the key to the page', async () => {
    const found = await message('dismissible')
    found.addEventListener('helix-dismiss', (event) => event.preventDefault())
    const key = pressEscape(found)
    await found.updateComplete
    expect(found.open).toBe(true)
    expect(key.defaultPrevented).toBe(false)
  })
})

describe('the states a message records', () => {
  test('closed once dismissed, and paused while its clock is held', async () => {
    const found = (await message('duration="5000"')) as Item & {
      dismiss(): boolean
      pause(): void
    }
    expect(hasState(found, 'closed')).toBe(false)
    found.pause()
    expect(hasState(found, 'paused')).toBe(true)
    found.dismiss()
    await found.updateComplete
    expect(hasState(found, 'closed')).toBe(true)
  })

  test('waiting while the region holds it back, hidden and with its clock stopped', async () => {
    const found = (await message('duration="40"')) as Item & { waiting: boolean }
    found.waiting = true
    await found.updateComplete
    expect(hasState(found, 'waiting')).toBe(true)
    expect(found.hidden).toBe(true)
    await new Promise((done) => setTimeout(done, 80))
    expect(found.open).toBe(true)
    found.waiting = false
    await found.updateComplete
    expect(found.hidden).toBe(false)
    const until = Date.now() + 1200
    while (Date.now() < until && found.open) {
      await new Promise((done) => setTimeout(done, 20))
    }
    expect(found.open).toBe(false)
  })
})
