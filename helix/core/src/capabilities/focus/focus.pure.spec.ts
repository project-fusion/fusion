import { afterEach, describe, expect, test } from 'bun:test'
import { fakeFocus } from './fake.js'
import { focus, setFocus } from './index.js'
import { serverFocus } from './server.js'

/** A part as a spec names one: any value stands for a platform's handle. */
interface Part {
  readonly name: string
}

const search: Part = { name: 'search' }
const close: Part = { name: 'close' }

afterEach(() => {
  setFocus(serverFocus)
})

describe('focus', () => {
  test('is the server implementation until one is set', () => {
    expect(focus()).toBe(serverFocus)
  })

  test('calls the implementation set last', () => {
    const fake = fakeFocus<Part>()
    setFocus(fake)
    focus().focus(search, true)
    expect(focus().focused()).toBe(search)
    expect(fake.moved).toEqual([{ node: search, preventScroll: true }])
  })

  test('moves nothing and finds nothing on the server', () => {
    expect(serverFocus.focus(search, false)).toBeUndefined()
    expect(serverFocus.focused()).toBeNull()
  })
})

describe('fakeFocus', () => {
  test('has nothing focused at its start', () => {
    expect(fakeFocus<Part>().focused()).toBeNull()
  })

  test('keeps each move in the order it was asked for', () => {
    const fake = fakeFocus<Part>()
    fake.focus(search, false)
    fake.focus(close, true)
    expect(fake.moved).toEqual([
      { node: search, preventScroll: false },
      { node: close, preventScroll: true },
    ])
    expect(fake.focused()).toBe(close)
  })

  test('puts focus where a reader moves it, and keeps no move', () => {
    const fake = fakeFocus<Part>()
    fake.focus(search, false)
    fake.place(close)
    expect(fake.focused()).toBe(close)
    fake.place(null)
    expect(fake.focused()).toBeNull()
    expect(fake.moved).toHaveLength(1)
  })
})
