import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { SwipeController } from './swipe-controller.js'

beforeAll(() => {
  registerDom()
})

const hosts: HTMLElement[] = []
afterEach(() => {
  for (const one of hosts.splice(0)) {
    one.remove()
  }
})

/* A host that is a real element, so the pointer events reach it, with the one
   hook the controller asks of a Lit host. */
const setup = (axis: 'x' | 'y' | 'off' = 'x', start?: (target: Element) => boolean) => {
  const host = document.createElement('div') as unknown as HTMLElement & ReactiveControllerHost
  const surface = document.createElement('div')
  const button = document.createElement('button')
  surface.append(button)
  host.append(surface)
  document.body.append(host)
  hosts.push(host)
  let controller: ReactiveController | undefined
  ;(host as unknown as { addController: (one: ReactiveController) => void }).addController = (
    one,
  ) => {
    controller = one
  }
  const moves: Array<[number, number]> = []
  const ends: Array<[number, number, number, number]> = []
  new SwipeController(host, {
    axis: () => (axis === 'off' ? undefined : axis),
    end: (dx, dy, vx, vy) => ends.push([dx, dy, vx, vy]),
    move: (dx, dy) => moves.push([dx, dy]),
    ...(start ? { start } : {}),
    surface: () => surface,
  })
  controller?.hostConnected?.()
  return { button, ends, moves, surface }
}

const pointer = (type: string, x: number, y: number, at: number): PointerEvent => {
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: x,
    clientY: y,
    composed: true,
    pointerId: 1,
  })
  Object.defineProperty(event, 'timeStamp', { value: at })
  return event
}

describe('a swipe', () => {
  test('starts once the pointer has gone far enough along the axis, and reports the distance', () => {
    const { ends, moves, surface } = setup()
    surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 104, 100, 10))
    expect(moves).toEqual([])
    window.dispatchEvent(pointer('pointermove', 140, 102, 20))
    expect(moves).toEqual([[40, 2]])
    expect(surface.hasAttribute('data-swiping')).toBe(true)
    window.dispatchEvent(pointer('pointermove', 160, 102, 30))
    window.dispatchEvent(pointer('pointerup', 160, 102, 30))
    expect(ends).toHaveLength(1)
    expect(ends[0]?.slice(0, 2)).toEqual([60, 2])
    expect(ends[0]?.[2]).toBeCloseTo(2)
    expect(surface.hasAttribute('data-swiping')).toBe(false)
  })

  test('a drag across the axis is left to the page', () => {
    const { ends, moves, surface } = setup('x')
    surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 103, 140, 10))
    window.dispatchEvent(pointer('pointermove', 140, 140, 20))
    window.dispatchEvent(pointer('pointerup', 140, 140, 20))
    expect(moves).toEqual([])
    expect(ends).toEqual([])
  })

  test('a tap is a tap, and reports nothing', () => {
    const { ends, surface } = setup()
    surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointerup', 102, 100, 10))
    expect(ends).toEqual([])
  })

  test('nothing starts while swiping is off, or where the host says no', () => {
    const off = setup('off')
    off.surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 160, 100, 10))
    expect(off.moves).toEqual([])
    const refused = setup('x', (target) => target.localName !== 'button')
    refused.button.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 160, 100, 10))
    expect(refused.moves).toEqual([])
  })

  test('a cancel puts it back, as a release that went nowhere', () => {
    const { ends, surface } = setup()
    surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 140, 100, 10))
    window.dispatchEvent(pointer('pointercancel', 140, 100, 20))
    expect(ends).toEqual([[0, 0, 0, 0]])
  })

  test('the click that ends a swipe is swallowed', () => {
    const { button, surface } = setup()
    let clicked = 0
    button.addEventListener('click', () => {
      clicked += 1
    })
    surface.dispatchEvent(pointer('pointerdown', 100, 100, 0))
    window.dispatchEvent(pointer('pointermove', 140, 100, 10))
    window.dispatchEvent(pointer('pointerup', 140, 100, 20))
    button.click()
    expect(clicked).toBe(0)
  })
})
