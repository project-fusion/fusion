import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import type { MachineUse } from '../ir.generated'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { eventOf, type Rove, useRovingFocus } from './roving-focus'

const TABS = {
  api: { events: [], props: [{ default: false, name: 'manual' }], states: [] },
  name: 'tabs',
  rules: [],
  tag: 'helix-tabs',
  version: '2.0',
} as unknown as Family

const USE: MachineUse = { bind: { manual: { prop: 'manual' } }, machine: 'roving-focus' }

/** A tab set's keys: arriving chooses, and a move past the last comes round. */
const TABBED: Rove = { chooses: true, reserved: [], wrap: true }

/** A list's keys: arriving only focuses, the ends stop a move, and the rows keep Left and Right. */
const LISTED: Rove = { chooses: false, reserved: ['ArrowLeft', 'ArrowRight'], wrap: false }

const member = (value: string, disabled = false): Member => ({
  chooses: true,
  disabled,
  node: () => value,
  value,
  words: value,
})

const press = (key: string, held: Partial<KeyPress> = {}): KeyPress => ({
  alt: false,
  claimed: false,
  control: false,
  key,
  meta: false,
  repeat: false,
  shift: false,
  ...held,
})

let focus = fakeFocus<string>()

beforeEach(() => {
  focus = fakeFocus<string>()
  setFocus(focus)
  setEnvironment(fakeEnvironment())
})

/**
 * Renders a set with these items and hands back its key handler, the choices
 * it made, and each arrival it told, with the item it came from and Shift.
 */
const rove = async (members: readonly Member[], manual = false, keys: Rove = TABBED) => {
  const arrived: string[] = []
  const chosen: string[] = []
  let key: ((from: string, pressed: KeyPress) => boolean) | undefined
  const Items = () => {
    key = useRovingFocus(
      TABS,
      { manual },
      USE,
      members,
      (value) => chosen.push(value),
      keys,
      (value, from, pressed) => arrived.push(`${from}>${value}${pressed.shift ? ' shift' : ''}`),
    )
    return null
  }
  await render(<Items />)
  return {
    arrived,
    chosen,
    press: async (from: string, pressed: KeyPress) => {
      let took = false
      await act(() => {
        took = key?.(from, pressed) ?? false
      })
      return took
    },
  }
}

describe('useRovingFocus', () => {
  test('moves focus on to the next item and chooses it where the set chooses on arrival', async () => {
    const set = await rove([member('a'), member('b'), member('c')])
    expect(await set.press('a', press('ArrowRight'))).toBe(true)
    expect(focus.focused()).toBe('b')
    expect(set.chosen).toEqual(['b'])
  })

  test('passes over a disabled item, and goes round from the last to the first', async () => {
    const set = await rove([member('a'), member('b', true), member('c')])
    await set.press('a', press('ArrowDown'))
    expect(focus.focused()).toBe('c')
    await set.press('c', press('ArrowDown'))
    expect(focus.focused()).toBe('a')
  })

  test('moves to either end with Home and End', async () => {
    const set = await rove([member('a'), member('b'), member('c')])
    await set.press('b', press('End'))
    expect(focus.focused()).toBe('c')
    await set.press('c', press('Home'))
    expect(focus.focused()).toBe('a')
  })

  test('focuses without choosing in a manual set', async () => {
    const set = await rove([member('a'), member('b')], true)
    await set.press('a', press('ArrowRight'))
    expect(focus.focused()).toBe('b')
    expect(set.chosen).toEqual([])
  })

  test('in a list, focuses without choosing, stops at the ends, and leaves Left and Right to the rows', async () => {
    const set = await rove([member('a'), member('b')], false, LISTED)
    await set.press('a', press('ArrowDown'))
    expect(focus.focused()).toBe('b')
    await set.press('b', press('ArrowDown'))
    expect(focus.focused()).toBe('b')
    expect(await set.press('b', press('ArrowLeft'))).toBe(false)
    expect(set.chosen).toEqual([])
  })

  test('leaves alone a key something nearer took, and a key with a modifier', async () => {
    const set = await rove([member('a'), member('b')])
    expect(await set.press('a', press('ArrowRight', { claimed: true }))).toBe(false)
    expect(await set.press('a', press('ArrowRight', { shift: true }))).toBe(false)
    expect(focus.focused()).toBeNull()
  })

  test('tells each move that lands on another item, with its key', async () => {
    const set = await rove([member('a'), member('b')], false, LISTED)
    await set.press('a', press('ArrowDown'))
    await set.press('b', press('ArrowDown'))
    expect(set.arrived).toEqual(['a>b'])
  })

  test('moves with Shift, Control, or Command held where the set reads them, and never with Alt', async () => {
    const set = await rove([member('a'), member('b')], false, { ...LISTED, held: true })
    expect(await set.press('a', press('ArrowDown', { shift: true }))).toBe(true)
    expect(await set.press('b', press('ArrowUp', { alt: true }))).toBe(false)
    expect(focus.focused()).toBe('b')
    expect(set.arrived).toEqual(['a>b shift'])
  })

  test('reaches a disabled item where the set does', async () => {
    const items = [member('a'), member('b', true)]
    const set = await rove(items, false, { ...LISTED, reachesDisabled: true })
    await set.press('a', press('ArrowDown'))
    expect(focus.focused()).toBe('b')
  })
})

describe('eventOf', () => {
  test('swaps the horizontal arrows on a page read right to left', () => {
    expect(eventOf(press('ArrowLeft'), true)).toBe(eventOf(press('ArrowRight'), false))
    expect(eventOf(press('ArrowUp'), true)).toBe(eventOf(press('ArrowUp'), false))
  })
})
