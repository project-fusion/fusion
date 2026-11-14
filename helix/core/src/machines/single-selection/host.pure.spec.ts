import { describe, expect, test } from 'bun:test'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { selectionHost } from './host.js'
import type { SelectionContext, SelectionInput, SelectionItem } from './machine.js'
import * as selection from './single-selection.generated.js'

const ITEMS: SelectionItem[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]

/** A set of three read once, with `active` current. */
const set = (active: string): SelectionContext => ({ active, held: ['a', 'b', 'c'] })

/** A choice of `value` among `items`. */
const choice = (value: string, items: SelectionItem[] = ITEMS): SelectionInput => ({
  items,
  value,
})

/**
 * Runs single selection with a platform that accepts each request where
 * `accepts`. `asked` keeps each request, and `activated` each item the
 * family is told is current.
 */
const select = (context: SelectionContext, accepts = true) => {
  const asked: string[] = []
  const activated: string[] = []
  const runner = run(
    selection,
    context,
    selectionHost({ activate: (value) => activated.push(value) }),
    {
      ask: (events) => {
        asked.push(...events)
        return accepts
      },
      timers: fakeTimers(),
    },
  )
  return { activated, asked, runner }
}

describe('selectionHost', () => {
  test('tells the consumer the item a choice makes current, once no listener refuses it', () => {
    const { activated, asked, runner } = select(set('a'))
    runner.send(selection.EVENT_CHOOSE, choice('b'))
    runner.send(selection.EVENT_CHOOSE, choice('c'))
    expect(asked).toEqual(['activate', 'activate'])
    expect(activated).toEqual(['b', 'c'])
  })

  test('tells the consumer nothing where a listener refuses the choice', () => {
    const { activated, asked, runner } = select(set('a'), false)
    runner.send(selection.EVENT_CHOOSE, choice('b'))
    expect(asked).toEqual(['activate'])
    expect(activated).toEqual([])
    expect(runner.context().active).toBe('a')
  })

  test('tells the consumer that no item is current after a choice of nothing', () => {
    const { activated, runner } = select(set('b'))
    runner.send(selection.EVENT_CHOOSE, choice(''))
    expect(activated).toEqual([''])
  })

  test('tells the consumer the neighbor that takes over from a removed current item', () => {
    const { activated, runner } = select(set('b'))
    runner.send(selection.EVENT_ITEMS, choice('', [{ value: 'a' }, { value: 'c' }]))
    expect(activated).toEqual(['c'])
  })

  test('tells the consumer nothing for the item the markup marks', () => {
    const { activated, runner } = select({ active: '', held: [] })
    runner.send(selection.EVENT_SEED, choice('', [{ value: 'a' }, { selected: true, value: 'b' }]))
    expect(runner.context().active).toBe('b')
    expect(activated).toEqual([])
  })

  test('tells the consumer nothing once stopped', () => {
    const { activated, asked, runner } = select(set('a'))
    runner.stop()
    runner.send(selection.EVENT_CHOOSE, choice('b'))
    runner.send(selection.EVENT_ITEMS, choice('', [{ value: 'b' }]))
    expect(asked).toEqual([])
    expect(activated).toEqual([])
  })
})
