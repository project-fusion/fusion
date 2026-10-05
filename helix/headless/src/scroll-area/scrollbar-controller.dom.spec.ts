import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveControllerHost } from 'lit'

/* The controller on a bare host, driven with synthetic pointer events and a
   short real hide delay. The scroll area's own specs drive it through the
   element. */

let ScrollbarController: typeof import('./scrollbar-controller.js').ScrollbarController

beforeAll(async () => {
  registerDom()
  ;({ ScrollbarController } = await import('./scrollbar-controller.js'))
})

type Host = HTMLElement & ReactiveControllerHost & { updates: number }

const made: HTMLElement[] = []

afterEach(() => {
  for (const one of made.splice(0)) {
    one.remove()
  }
})

const setup = async (mode: 'always' | 'auto' | 'hover' | 'scroll') => {
  const host = (await mount('<div></div>')) as Host
  made.push(host)
  host.updates = 0
  const controllers: { hostConnected?: () => void; hostDisconnected?: () => void }[] = []
  Object.assign(host, {
    addController: (one: (typeof controllers)[number]) => controllers.push(one),
    requestUpdate: () => {
      host.updates += 1
    },
    updateComplete: Promise.resolve(true),
  })
  const box = document.createElement('div')
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: 100 })
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 400 })
  let ended = 0
  const controller = new ScrollbarController(host, {
    box: () => box,
    hideDelay: () => 20,
    mode: () => mode,
    scrollEnd: () => {
      ended += 1
    },
  })
  for (const one of controllers) {
    one.hostConnected?.()
  }
  const bar = document.createElement('div')
  bar.innerHTML = '<div part="thumb"></div>'
  host.append(bar)
  const thumb = bar.firstElementChild as HTMLElement
  const down = (): void => {
    const event = new PointerEvent('pointerdown', { bubbles: true, button: 0, cancelable: true })
    Object.defineProperty(event, 'currentTarget', { value: bar })
    Object.defineProperty(event, 'target', { value: thumb })
    controller.handleVerticalDown(event)
  }
  return { controller, down, ended: () => ended, host }
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

describe('the scrollbar controller', () => {
  test('reads what each scrollbar shows, and renders only on a change', async () => {
    const { controller, host } = await setup('auto')
    const box = document.createElement('div')
    Object.defineProperty(box, 'clientHeight', { value: 100 })
    Object.defineProperty(box, 'scrollHeight', { value: 400 })
    controller.read(box)
    expect(controller.bars?.vertical).toEqual({ along: 0, drawn: true, thumb: 0.25 })
    const updates = host.updates
    controller.read(box)
    expect(host.updates).toBe(updates)
  })

  test('shows under scroll while the content moves, and puts the bars away after the delay', async () => {
    const { controller } = await setup('scroll')
    expect(controller.shown).toBe(false)
    controller.wake()
    expect(controller.shown).toBe(true)
    await wait(40)
    expect(controller.shown).toBe(false)
  })

  test('shows under hover while the pointer is over the host', async () => {
    const { controller, host } = await setup('hover')
    host.dispatchEvent(new Event('pointerenter'))
    expect(controller.shown).toBe(true)
    host.dispatchEvent(new Event('pointerleave'))
    await wait(40)
    expect(controller.shown).toBe(false)
  })

  test('holds the scrollends of a drag and sends one once it is let go', async () => {
    const { controller, down, ended } = await setup('always')
    down()
    expect(controller.dragging).toBe(true)
    expect(controller.holdsScrollEnd()).toBe(true)
    expect(controller.holdsScrollEnd()).toBe(true)
    controller.handleDragEnd()
    expect(ended()).toBe(0)
    await wait(150)
    expect(ended()).toBe(1)
  })

  test('lets the browser’s last scrollend stand for the held ones', async () => {
    const { controller, down, ended } = await setup('always')
    down()
    controller.holdsScrollEnd()
    controller.handleDragEnd()
    // The last step's own arrives after the drag, and is the one sent.
    expect(controller.holdsScrollEnd()).toBe(false)
    await wait(150)
    expect(ended()).toBe(0)
  })

  test('sends nothing after a drag that scrolled nothing', async () => {
    const { controller, down, ended } = await setup('always')
    down()
    controller.handleDragEnd()
    await wait(150)
    expect(ended()).toBe(0)
  })
})
