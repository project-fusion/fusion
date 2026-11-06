import { afterEach, describe, expect, test } from 'bun:test'
import { fakeFocus } from '../../capabilities/focus/fake.js'
import { setFocus } from '../../capabilities/focus/index.js'
import { serverFocus } from '../../capabilities/focus/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { typeaheadHost } from './host.js'
import type { TypeaheadContext, TypeaheadInput, TypeaheadItem } from './machine.js'
import * as typeahead from './typeahead.generated.js'

afterEach(() => {
  setFocus(serverFocus)
})

const ITEMS: readonly TypeaheadItem[] = [
  { value: 'cambodia', words: 'Cambodia' },
  { value: 'canada', words: 'Canada' },
  { value: 'chile', words: 'Chile' },
]

const IDLE: TypeaheadContext = { at: '', letters: '' }

/**
 * `character` typed with focus on the item `from`, in a set that chooses on
 * arrival where `selects`.
 */
const typed = (character: string, from: string, selects = false): TypeaheadInput => ({
  character,
  focus: true,
  from,
  items: ITEMS,
  selects,
})

/**
 * Runs typeahead over three countries, each drawn as its name, with a fake for
 * focus and one for timers. `heard` keeps each move of focus and each choice,
 * in the order they came.
 */
const search = () => {
  const heard: string[] = []
  const moves = fakeFocus<string>()
  setFocus<string>({
    ...moves,
    focus: (node, preventScroll) => {
      heard.push(`focus ${node}`)
      moves.focus(node, preventScroll)
    },
  })
  const timers = fakeTimers()
  const runner = run(
    typeahead,
    IDLE,
    typeaheadHost<string>({
      item: (value) => ITEMS.find((item) => item.value === value)?.words,
      select: (value) => heard.push(`select ${value}`),
    }),
    { ask: () => true, timers },
  )
  return { heard, moves, runner, timers }
}

describe('typeaheadHost', () => {
  test('moves focus to the item the letters land on, and lets it scroll into view', () => {
    const { heard, moves, runner } = search()
    runner.send(typeahead.EVENT_TYPE, typed('c', 'cambodia'))
    expect(heard).toEqual(['focus Canada'])
    expect(moves.moved).toEqual([{ node: 'Canada', preventScroll: false }])
  })

  test('chooses the item after focusing it, where the set chooses on arrival', () => {
    const { heard, runner } = search()
    runner.send(typeahead.EVENT_TYPE, typed('c', 'cambodia', true))
    expect(heard).toEqual(['focus Canada', 'select canada'])
  })

  test('builds one search from letters typed together, and starts a new one after a pause', () => {
    const { heard, runner, timers } = search()
    runner.send(typeahead.EVENT_TYPE, typed('c', 'cambodia'))
    runner.send(typeahead.EVENT_TYPE, typed('h', 'canada'))
    timers.advance(500)
    runner.send(typeahead.EVENT_TYPE, typed('c', 'chile'))
    expect(heard).toEqual(['focus Canada', 'focus Chile', 'focus Cambodia'])
  })

  test('moves nothing for letters no item starts with', () => {
    const { heard, moves, runner } = search()
    runner.send(typeahead.EVENT_TYPE, typed('z', 'cambodia', true))
    expect(runner.state()).toBe(typeahead.STATE_SEARCHING)
    expect(heard).toEqual([])
    expect(moves.focused()).toBeNull()
  })

  test('chooses nothing once stopped, and ends the pause it was waiting on', () => {
    const { heard, runner, timers } = search()
    runner.send(typeahead.EVENT_TYPE, typed('c', 'cambodia', true))
    runner.stop()
    expect(timers.pending().timeouts).toBe(0)
    runner.send(typeahead.EVENT_TYPE, typed('h', 'canada', true))
    expect(heard).toEqual(['focus Canada', 'select canada'])
  })
})
