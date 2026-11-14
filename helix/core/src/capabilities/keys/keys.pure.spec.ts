import { afterEach, describe, expect, test } from 'bun:test'
import { fakeKeys } from './fake.js'
import { keys, setKeys } from './index.js'
import { serverKeys } from './server.js'

afterEach(() => {
  setKeys(serverKeys)
})

/** A part as a spec stands one in: any value works as a node for the fake. */
interface Part {
  readonly name: string
}

describe('keys', () => {
  test('is the server implementation until one is set', () => {
    expect(keys()).toBe(serverKeys)
  })

  test('calls the implementation set last', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    setKeys(fake)
    keys().listen(list, () => true)
    expect(fake.listening(list)).toBe(1)
  })
})

describe('serverKeys', () => {
  test('hears nothing, and stops without an error', () => {
    const stop = serverKeys.listen({}, () => true)
    expect(() => stop()).not.toThrow()
    const anywhere = serverKeys.listenAnywhere({}, () => true)
    expect(() => anywhere()).not.toThrow()
  })
})

describe('fakeKeys', () => {
  test('hands the listener the press, with each modifier left out as `false`', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    const heard: unknown[] = []
    fake.listen(list, (press) => {
      heard.push(press)
      return false
    })
    fake.press(list, 'Tab', { shift: true })
    expect(heard).toEqual([
      {
        alt: false,
        claimed: false,
        control: false,
        key: 'Tab',
        meta: false,
        repeat: false,
        shift: true,
      },
    ])
  })

  test('answers that a press was taken where the listener answers `true`', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    fake.listen(list, (press) => press.key === 'ArrowDown')
    expect(fake.press(list, 'ArrowDown')).toBe(true)
    expect(fake.press(list, 'a')).toBe(false)
  })

  test('presses a key that something nearer the key already claimed', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    fake.listen(list, (press) => !press.claimed)
    expect(fake.press(list, 'ArrowDown', { claimed: true })).toBe(false)
    expect(fake.press(list, 'ArrowDown')).toBe(true)
    expect(fake.pressed.map(({ press }) => press.claimed)).toEqual([true, false])
  })

  test('hears a press only on the node it listens to', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    const other = { name: 'other' }
    let heard = 0
    fake.listen(list, () => {
      heard += 1
      return true
    })
    expect(fake.press(other, 'Enter')).toBe(false)
    expect(heard).toBe(0)
  })

  test('calls each listener on the node, and the press is taken where any one takes it', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    const heard: string[] = []
    fake.listen(list, () => {
      heard.push('first')
      return true
    })
    fake.listen(list, () => {
      heard.push('second')
      return false
    })
    expect(fake.press(list, 'Home')).toBe(true)
    expect(heard).toEqual(['first', 'second'])
  })

  test('calls no listener once it is stopped, including one stopped by an earlier listener', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    const heard: string[] = []
    const hears = (name: string) => (): boolean => {
      heard.push(name)
      return true
    }
    fake.listen(list, hears('stopped first'))()
    let stopLater = (): void => undefined
    fake.listen(list, () => {
      heard.push('stopper')
      stopLater()
      return false
    })
    stopLater = fake.listen(list, hears('stopped later'))
    expect(fake.press(list, 'End')).toBe(false)
    expect(heard).toEqual(['stopper'])
    expect(fake.listening(list)).toBe(1)
  })

  test('hands a press on any node to a listener anywhere first, which keeps a press it takes from the node', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    const heard: string[] = []
    fake.listen(list, (press) => {
      heard.push(`list ${press.key}`)
      return false
    })
    const stop = fake.listenAnywhere(list, (press) => {
      heard.push(`anywhere ${press.key}`)
      return press.key === 'Escape'
    })
    expect(fake.listeningAnywhere()).toBe(1)
    expect([
      fake.press(list, 'Escape'),
      fake.press(list, 'a'),
      fake.press({ name: 'page' }, 'b'),
    ]).toEqual([true, false, false])
    expect(heard).toEqual(['anywhere Escape', 'anywhere a', 'list a', 'anywhere b'])
    stop()
    expect([fake.listeningAnywhere(), fake.press(list, 'Escape')]).toEqual([0, false])
  })

  test('keeps each press in order, with its node and whether it was taken', () => {
    const fake = fakeKeys<Part>()
    const list = { name: 'list' }
    fake.listen(list, (press) => press.key === 'Escape')
    fake.press(list, 'x', { control: true, repeat: true })
    fake.press(list, 'Escape')
    expect(fake.pressed.map(({ node, press, taken }) => [node.name, press.key, taken])).toEqual([
      ['list', 'x', false],
      ['list', 'Escape', true],
    ])
    expect(fake.pressed[0]?.press.control).toBe(true)
    expect(fake.pressed[0]?.press.repeat).toBe(true)
  })
})
