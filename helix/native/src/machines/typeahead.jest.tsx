import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setTimers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import type { Member } from './collection'
import { type Typing, useTypeahead } from './typeahead'

const member = (value: string, words: string): Member => ({
  chooses: true,
  disabled: false,
  node: () => value,
  value,
  words,
})

const COUNTRIES = [
  member('cm', 'Cambodia'),
  member('ca', 'Canada'),
  member('cl', 'Chile'),
  member('de', 'Denmark'),
]

const typed = (key: string, held: Partial<KeyPress> = {}): KeyPress => ({
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
let timers = fakeTimers()

beforeEach(() => {
  focus = fakeFocus<string>()
  setFocus(focus)
  timers = fakeTimers()
  setTimers(timers)
})

/** Renders a set searching these countries, and hands back its typing and the choices it made. */
const search = async (selects = true, members: readonly Member[] = COUNTRIES) => {
  const arrived: string[] = []
  const chosen: string[] = []
  let typing: Typing | undefined
  const Items = () => {
    typing = useTypeahead(members, selects, (value) => chosen.push(value), {
      arrived: (value, from) => arrived.push(`${from}>${value}`),
      reachesDisabled: members !== COUNTRIES,
    })
    return null
  }
  await render(<Items />)
  const type = async (from: string, key: string, held: Partial<KeyPress> = {}) => {
    let took = false
    await act(() => {
      took = typing?.key(from, typed(key, held)) ?? false
    })
    return took
  }
  return { arrived, chosen, type }
}

describe('useTypeahead', () => {
  test('moves to the first item the letters typed together start', async () => {
    const set = await search()
    await set.type('de', 'c')
    await set.type('cm', 'a')
    await set.type('cm', 'n')
    expect(focus.focused()).toBe('ca')
    expect(set.chosen.at(-1)).toBe('ca')
  })

  test('starts a new search once half a second passes with nothing typed', async () => {
    const set = await search()
    await set.type('de', 'c')
    await act(() => timers.advance(500))
    await set.type('cm', 'd')
    expect(focus.focused()).toBe('de')
  })

  test('focuses without choosing where the set does not choose on arrival', async () => {
    const set = await search(false)
    await set.type('de', 'c')
    expect(focus.focused()).toBe('cm')
    expect(set.chosen).toEqual([])
  })

  test('leaves a key with Control or Command held to the page', async () => {
    const set = await search()
    expect(await set.type('de', 'c', { control: true })).toBe(false)
    expect(await set.type('de', 'c', { meta: true })).toBe(false)
    expect(focus.focused()).toBeNull()
  })

  test('leaves a key that types more than one character, or none, to the page', async () => {
    const set = await search()
    expect(await set.type('de', 'Enter')).toBe(false)
  })

  test('tells each search that lands on another item', async () => {
    const set = await search(false)
    await set.type('de', 'c')
    await set.type('cm', 'a')
    expect(set.arrived).toEqual(['de>cm'])
  })

  test('reaches a disabled item where the set does', async () => {
    const set = await search(false, [
      member('a', 'Austria'),
      { ...member('b', 'Belgium'), disabled: true },
    ])
    await set.type('a', 'b')
    expect(focus.focused()).toBe('b')
  })
})
