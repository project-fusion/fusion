import { afterEach, describe, expect, test } from 'bun:test'
import type { Scrolled } from '../types.generated.js'
import { scrolledAt } from './ends.js'
import { fakeScroll } from './fake.js'
import { scroll, setScroll } from './index.js'
import { serverScroll } from './server.js'

/** A part as a spec names one: any value stands for a platform's handle. */
interface Part {
  readonly name: string
}

const dialog: Part = { name: 'dialog' }
const drawer: Part = { name: 'drawer' }
const list: Part = { name: 'list' }
const row: Part = { name: 'row' }

afterEach(() => {
  setScroll(serverScroll)
})

describe('scroll', () => {
  test('is the server implementation until one is set', () => {
    expect(scroll()).toBe(serverScroll)
  })

  test('calls the implementation set last', () => {
    const fake = fakeScroll<Part>()
    setScroll(fake)
    scroll().by(list, 0, 24)
    expect(scroll().offset(list)).toEqual({ x: 0, y: 24 })
    expect(fake.calls).toEqual([{ call: 'by', node: list, x: 0, y: 24 }])
  })

  test('scrolls nothing and holds nothing on the server', () => {
    expect(serverScroll.by(list, 10, 10)).toBeUndefined()
    expect(serverScroll.reveal(row)).toBeUndefined()
    expect(serverScroll.offset(list)).toEqual({ x: 0, y: 0 })
    expect(serverScroll.lock(dialog)()).toBeUndefined()
  })
})

describe('fakeScroll', () => {
  test('reads an offset of zero for a node never scrolled', () => {
    expect(fakeScroll<Part>().offset(list)).toEqual({ x: 0, y: 0 })
  })

  test('adds each scroll to the offset of its own node', () => {
    const fake = fakeScroll<Part>()
    fake.by(list, 0, 24)
    fake.by(list, 8, -4)
    fake.by(row, 5, 0)
    expect(fake.offset(list)).toEqual({ x: 8, y: 20 })
    expect(fake.offset(row)).toEqual({ x: 5, y: 0 })
  })

  test('keeps each call in the order it was made, and leaves the offset where a reveal is asked', () => {
    const fake = fakeScroll<Part>()
    fake.reveal(row)
    fake.by(list, 0, 10)
    fake.offset(list)
    expect(fake.calls).toEqual([
      { call: 'reveal', node: row },
      { call: 'by', node: list, x: 0, y: 10 },
    ])
    expect(fake.offset(row)).toEqual({ x: 0, y: 0 })
  })

  test('sets an offset where a reader scrolls, and keeps no call', () => {
    const fake = fakeScroll<Part>()
    fake.place(list, { x: 0, y: 300 })
    expect(fake.offset(list)).toEqual({ x: 0, y: 300 })
    expect(fake.calls).toEqual([])
  })

  test('keeps the layer with each lock and unlock, and lets go of each lock once', () => {
    const fake = fakeScroll<Part>()
    const stopDialog = fake.lock(dialog)
    const stopDrawer = fake.lock(drawer)
    expect(fake.holders()).toEqual([dialog, drawer])
    stopDialog()
    stopDialog()
    expect(fake.holders()).toEqual([drawer])
    stopDrawer()
    expect(fake.holders()).toEqual([])
    expect(fake.calls).toEqual([
      { call: 'lock', node: dialog },
      { call: 'lock', node: drawer },
      { call: 'unlock', node: dialog },
      { call: 'unlock', node: drawer },
    ])
  })

  test('holds a layer that locks twice once, and a stop from an earlier lock lets go of nothing', () => {
    const fake = fakeScroll<Part>()
    const first = fake.lock(dialog)
    fake.lock(dialog)
    expect(fake.holders()).toEqual([dialog])
    first()
    expect(fake.holders()).toEqual([])
    fake.lock(dialog)
    first()
    expect(fake.holders()).toEqual([dialog])
  })
})

describe('fakeScroll.to, observe, and settle', () => {
  test('keeps each scroll to an offset, and tells each observer where the part stands', () => {
    const fake = fakeScroll<Part>()
    fake.size(list, { content: { height: 400, width: 100 }, frame: { height: 100, width: 100 } })
    const heard: Scrolled[] = []
    const stop = fake.observe(list, (scrolled) => heard.push(scrolled))
    fake.to(list, 0, 300, true)
    fake.settle(list)
    stop()
    fake.place(list, { x: 0, y: 0 })
    expect(fake.calls).toEqual([{ call: 'to', node: list, smooth: true, x: 0, y: 300 }])
    expect(heard.map(({ settled, y }) => ({ settled, y }))).toEqual([
      { settled: false, y: { end: true, start: false } },
      { settled: true, y: { end: true, start: false } },
    ])
  })
})

describe('scrolledAt', () => {
  test('stands at an end within a pixel of it, and reads a start below zero as one', () => {
    const lengths = { content: { height: 100, width: 300 }, frame: { height: 100, width: 100 } }
    expect(scrolledAt({ x: -199.5, y: 0 }, lengths, false)).toEqual({
      offset: { x: -199.5, y: 0 },
      settled: false,
      x: { end: true, start: false },
      y: { end: true, start: true },
    })
  })
})
