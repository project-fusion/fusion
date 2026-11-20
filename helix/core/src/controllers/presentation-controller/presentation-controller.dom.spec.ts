import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { PresentationController } from './presentation-controller.js'

/**
 * A sheet or a popover by the window. **`matchMedia` is stood in for**, since
 * happy-dom does not evaluate a range query against the window, and what is
 * under test is the answer for each width and the turn between them.
 */
beforeAll(() => {
  registerDom()
})

/** A query whose matching the spec moves, as a resized window does. */
const fakeQuery = () => {
  const heard = new Set<() => void>()
  const query = {
    addEventListener: (_: string, listener: () => void) => heard.add(listener),
    matches: false,
    media: '',
    removeEventListener: (_: string, listener: () => void) => heard.delete(listener),
  }
  return {
    heard,
    move: (matches: boolean) => {
      query.matches = matches
      for (const listener of [...heard]) {
        listener()
      }
    },
    query,
  }
}

const real = window.matchMedia

afterEach(() => {
  window.matchMedia = real
})

/** A host that asks for `asked` and keeps what it is told. */
const hostAsking = (asked: () => unknown) => {
  const told: boolean[] = []
  const host = { addController: () => {}, requestUpdate: () => {} }
  const controller = new PresentationController(host as never, {
    asked,
    changed: (sheet) => told.push(sheet),
  })
  return { controller, told }
}

describe('a panel that asks for auto', () => {
  test('is a sheet in a window narrower than 30rem, and a popover in a wider one', () => {
    const window30 = fakeQuery()
    let asked = ''
    window.matchMedia = ((media: string) => {
      asked = media
      return window30.query
    }) as never
    const { controller, told } = hostAsking(() => 'auto')
    controller.hostConnected()
    expect(asked).toBe('(width < 30rem)')
    expect(controller.sheet).toBe(false)
    window30.move(true)
    expect(controller.sheet).toBe(true)
    window30.move(false)
    expect(told).toEqual([false, true, false])
    controller.hostDisconnected()
    expect(window30.heard.size).toBe(0)
  })
})

describe('a panel that asks for one presentation', () => {
  test('is that one at every width, and turns as its prop does', () => {
    const narrow = fakeQuery()
    narrow.query.matches = true
    window.matchMedia = (() => narrow.query) as never
    let presentation = 'popover'
    const { controller, told } = hostAsking(() => presentation)
    controller.hostConnected()
    expect(controller.sheet).toBe(false)
    presentation = 'sheet'
    controller.hostUpdated()
    narrow.move(false)
    expect(controller.sheet).toBe(true)
    expect(told).toEqual([false, true])
  })
})
