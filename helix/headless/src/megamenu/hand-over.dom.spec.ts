import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { HandOver, type Motion } from './hand-over.js'

beforeAll(() => {
  registerDom()
})

/** A stand-in megamenu: an element in the bar that can be asked to close. */
type Stub = HTMLElement & { requestOpen(open: boolean): boolean; refuses: boolean }

const motions = new Map<Element, Motion | undefined>()

const bar = (): { handOver: HandOver<Stub>; first: Stub; second: Stub; third: Stub } => {
  const handOver = new HandOver<Stub>((megamenu, to) => motions.set(megamenu, to))
  const stub = (): Stub => {
    const element = document.createElement('div') as unknown as Stub
    element.refuses = false
    element.requestOpen = (open) => {
      if (!open && element.refuses) {
        return false
      }
      handOver.close(element)
      return true
    }
    document.body.append(element)
    handOver.add(element)
    return element
  }
  return { first: stub(), handOver, second: stub(), third: stub() }
}

afterEach(() => {
  /* A press leaves `once` listeners on the window; ending it takes them off. */
  window.dispatchEvent(new Event('pointerup'))
  window.dispatchEvent(new Event('pointercancel'))
  document.body.replaceChildren()
  motions.clear()
})

describe('handing the open panel along the bar', () => {
  /* Radix's data-motion pairing: moving toward the end, the panel opening
     enters from the end and the one closing leaves toward the start. */
  test('says which way the reader moved, forward and back', () => {
    const { handOver, first, second } = bar()
    expect(handOver.open(first)).toBeUndefined()
    expect(motions.get(first)).toBeUndefined()
    expect(handOver.open(second)).toBe(first)
    expect(motions.get(second)).toBe('from-end')
    expect(motions.get(first)).toBe('to-start')
    expect(handOver.showing).toBe(second)

    expect(handOver.open(first)).toBe(second)
    expect(motions.get(first)).toBe('from-start')
    expect(motions.get(second)).toBe('to-end')
  })

  test('a refused close keeps the other panel and clears its direction', () => {
    const { handOver, first, second } = bar()
    handOver.open(first)
    first.refuses = true
    handOver.open(second)
    expect(motions.get(first)).toBeUndefined()
    expect(motions.get(second)).toBe('from-end')
  })

  /* Only the latest move is described: a panel closing on its own moved
     nowhere, so every direction clears, the last hand-over's included. */
  test('a panel that closes on its own clears every direction', () => {
    const { handOver, first, second, third } = bar()
    handOver.open(first)
    handOver.open(second)
    motions.set(third, 'to-end')
    handOver.close(second)
    expect(handOver.showing).toBeUndefined()
    expect([motions.get(first), motions.get(second), motions.get(third)]).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  test('forgets a megamenu that leaves the page', () => {
    const { handOver, first } = bar()
    handOver.open(first)
    handOver.press(first)
    handOver.remove(first)
    expect(handOver.showing).toBeUndefined()
    expect(handOver.pressed).toBeUndefined()
    expect(handOver.connected.has(first)).toBe(false)
  })

  test('holds a press until a task after it ends', async () => {
    const { handOver, second } = bar()
    handOver.press(second)
    expect(handOver.pressed).toBe(second)
    window.dispatchEvent(new Event('pointerup'))
    expect(handOver.pressed).toBe(second)
    await new Promise((resolve) => setTimeout(resolve))
    expect(handOver.pressed).toBeUndefined()
  })
})
