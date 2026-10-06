import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

  /* A message that arrives in a background tab waits for the reader to come
     back, as React Aria's toast queue does: spent while hidden, it was gone
     before anyone could read it. */
  test('holds its clock while the page is hidden, and runs it again once shown', async () => {
    let hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    restore = () => {
      delete (document as unknown as { hidden?: boolean }).hidden
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
  const internalsOf = (one: Element) =>
    (one as unknown as { internals: ElementInternals }).internals

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
