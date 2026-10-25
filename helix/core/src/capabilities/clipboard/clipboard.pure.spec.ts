import { afterEach, describe, expect, test } from 'bun:test'
import { fakeClipboard } from './fake.js'
import { clipboard, setClipboard } from './index.js'
import { serverClipboard } from './server.js'

afterEach(() => {
  setClipboard(serverClipboard)
})

describe('clipboard', () => {
  test('is the server implementation until one is set', () => {
    expect(clipboard()).toBe(serverClipboard)
  })

  test('calls the implementation set last', async () => {
    const fake = fakeClipboard()
    setClipboard(fake)
    expect(await clipboard().write('#3b82f6')).toBe(true)
    expect(fake.written).toEqual(['#3b82f6'])
  })

  test('writes nothing on the server', async () => {
    expect(await serverClipboard.write('anything')).toBe(false)
  })

  test('the fake refuses while it is told to, and keeps nothing it refused', async () => {
    const fake = fakeClipboard()
    fake.refuses = true
    expect(await fake.write('kept out')).toBe(false)
    fake.refuses = false
    expect(await fake.write('kept')).toBe(true)
    expect(fake.written).toEqual(['kept'])
  })
})
