import { describe, expect, test } from 'bun:test'
import { rovingStop } from './roving-stop.js'

interface Item {
  disabled: boolean
  name: string
  selected?: boolean
}

const read = {
  disabled: (item: Item) => item.disabled,
  selected: (item: Item) => item.selected === true,
}

describe('the tab stop of a group', () => {
  const a = { disabled: false, name: 'a' }
  const b = { disabled: false, name: 'b', selected: true }
  const off = { disabled: true, name: 'off' }

  test('is the item the reader was last on', () => {
    expect(rovingStop([a, b], a, read)).toBe(a)
  })

  test('then the first chosen, then the first that can be reached', () => {
    expect(rovingStop([a, b], undefined, read)).toBe(b)
    expect(rovingStop([off, a], undefined, read)).toBe(a)
  })

  test('never a disabled item, nor one that has left', () => {
    expect(rovingStop([off, a], off, read)).toBe(a)
    expect(rovingStop([a], { disabled: false, name: 'gone' }, read)).toBe(a)
    expect(rovingStop([off], undefined, read)).toBeUndefined()
  })

  test('a chosen item that is disabled does not take it', () => {
    const chosenOff = { disabled: true, name: 'x', selected: true }
    expect(rovingStop([a, chosenOff], undefined, read)).toBe(a)
  })

  test('with nothing to read, the last item, else the first', () => {
    expect(rovingStop(['a', 'b', 'c'], 'b')).toBe('b')
    expect(rovingStop(['a', 'b', 'c'], 'gone')).toBe('a')
    expect(rovingStop([], undefined)).toBeUndefined()
  })
})
