import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ZoomController as Zoom } from './zoom-controller.js'

let ZoomController: typeof Zoom

beforeAll(async () => {
  registerDom()
  ;({ ZoomController } = await import('./zoom-controller.js'))
})

const made: { controller: Zoom; host: HTMLElement }[] = []

afterEach(() => {
  for (const { controller, host } of made.splice(0)) {
    controller.hostDisconnected()
    host.remove()
  }
})

/** A host that is only a box 400 by 300 at the page's corner, holding the surface. */
const zoomer = (max = 3): { changes: number[]; controller: Zoom; surface: HTMLElement } => {
  const host = document.createElement('div') as unknown as HTMLElement & ReactiveControllerHost
  const surface = document.createElement('div')
  host.append(surface)
  document.body.append(host)
  surface.getBoundingClientRect = () =>
    ({ bottom: 300, height: 300, left: 0, right: 400, top: 0, width: 400 }) as DOMRect
  let added: ReactiveController | undefined
  Object.assign(host, {
    addController: (one: ReactiveController) => {
      added = one
    },
  })
  const changes: number[] = []
  const controller = new ZoomController(host, {
    max: () => max,
    onChange: (scale) => changes.push(scale),
    surface: () => surface,
  })
  added?.hostConnected?.()
  made.push({ controller, host })
  return { changes, controller, surface }
}

const pointer = (
  type: string,
  id: number,
  x: number,
  y: number,
  target: EventTarget = window,
): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: id,
    }),
  )
}

describe('zooming into an item', () => {
  test('a double press zooms all the way in about the point, and back out', () => {
    const { controller, surface } = zoomer()
    surface.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 300, clientY: 150, composed: true }),
    )
    expect(controller.scale).toBe(3)
    /* The point 100 right of the middle stays where it was: pan + 3 * 100 / 3. */
    expect(controller.pan).toEqual({ x: -200, y: 0 })
    surface.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 300, clientY: 150, composed: true }),
    )
    expect(controller.scale).toBe(1)
    expect(controller.pan).toEqual({ x: 0, y: 0 })
  })

  test('two fingers moving apart scale it, held to the most it may grow', () => {
    const { controller, surface } = zoomer()
    pointer('pointerdown', 1, 150, 150, surface)
    pointer('pointerdown', 2, 250, 150, surface)
    expect(controller.pinched).toBe(true)
    pointer('pointermove', 2, 350, 150)
    pointer('pointermove', 1, 50, 150)
    expect(controller.scale).toBe(3)
    pointer('pointerup', 1, 50, 150)
    pointer('pointerup', 2, 350, 150)
    expect(controller.engaged).toBe(true)
  })

  test('one pointer moves a zoomed item, never past its edges', () => {
    const { controller, surface } = zoomer(2)
    controller.zoomTo(2)
    pointer('pointerdown', 1, 200, 150, surface)
    pointer('pointermove', 1, 260, 170)
    expect(controller.pan).toEqual({ x: 60, y: 20 })
    pointer('pointermove', 1, 900, 900)
    expect(controller.pan).toEqual({ x: 200, y: 150 })
    pointer('pointerup', 1, 900, 900)
  })

  test('does nothing where zooming is off', () => {
    const { changes, controller, surface } = zoomer(1)
    surface.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 300, clientY: 150, composed: true }),
    )
    pointer('pointerdown', 1, 150, 150, surface)
    pointer('pointerdown', 2, 250, 150, surface)
    pointer('pointermove', 2, 350, 150)
    expect([controller.scale, changes.length, controller.pinched]).toEqual([1, 0, false])
  })
})
