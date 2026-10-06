import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { LongPress as Watcher } from './long-press.js'

/* Imported once the DOM is registered: core loaded first leaves every spec file
   after this one in the process without a document. */
let LongPress: typeof Watcher
let LONG_PRESS_DELAY = 0
let LONG_PRESS_SLOP = 0

beforeAll(async () => {
  registerDom()
  const module = await import('./long-press.js')
  LongPress = module.LongPress
  LONG_PRESS_DELAY = module.LONG_PRESS_DELAY
  LONG_PRESS_SLOP = module.LONG_PRESS_SLOP
})

/** The least a controller needs of a host: somewhere to register. */
const host = (): ReactiveControllerHost => ({
  addController: (_controller: ReactiveController) => {},
  removeController: () => {},
  requestUpdate: () => {},
  updateComplete: Promise.resolve(true),
})

const pointer = (type: string, x = 0, button = 0): PointerEvent =>
  new PointerEvent(type, { button, clientX: x, clientY: 0 })

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

let presses: Watcher[] = []

afterEach(() => {
  for (const press of presses) {
    press.cancel()
  }
  presses = []
})

const watch = (): { heard: string[]; press: Watcher } => {
  const heard: string[] = []
  const press = new LongPress(host(), { onLongPress: () => heard.push('long') })
  presses.push(press)
  return { heard, press }
}

describe('a long press', () => {
  test('is heard once the press is held for the delay, and takes the click it ends in once', async () => {
    const { heard, press } = watch()
    press.down(pointer('pointerdown'))
    await wait(LONG_PRESS_DELAY + 40)
    press.up()
    expect(heard).toEqual(['long'])
    expect([press.takeClick(), press.takeClick()]).toEqual([true, false])
  })

  test('a press released before the delay is an ordinary one', async () => {
    const { heard, press } = watch()
    press.down(pointer('pointerdown'))
    press.up()
    await wait(LONG_PRESS_DELAY + 40)
    expect(heard).toEqual([])
    expect(press.takeClick()).toBe(false)
  })

  test('a pointer that drifts past the slop is scrolling, and a secondary button never counts', async () => {
    const { heard, press } = watch()
    press.down(pointer('pointerdown'))
    press.move(pointer('pointermove', LONG_PRESS_SLOP + 1))
    press.down(pointer('pointerdown', 0, 2))
    await wait(LONG_PRESS_DELAY + 40)
    expect(heard).toEqual([])
  })

  test('a held press that makes no click gives up its claim when the task ends', async () => {
    const { press } = watch()
    press.down(pointer('pointerdown'))
    await wait(LONG_PRESS_DELAY + 40)
    press.up()
    await wait(0)
    expect(press.takeClick()).toBe(false)
  })
})
