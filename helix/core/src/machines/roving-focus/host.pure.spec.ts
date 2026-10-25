import { afterEach, describe, expect, test } from 'bun:test'
import { fakeFocus } from '../../capabilities/focus/fake.js'
import { setFocus } from '../../capabilities/focus/index.js'
import { serverFocus } from '../../capabilities/focus/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { rovingHost } from './host.js'
import type { RovingContext } from './machine.js'
import * as roving from './roving-focus.generated.js'

afterEach(() => {
  setFocus(serverFocus)
})

const ITEMS = ['first', 'second', 'third'] as const

/** A press on a set of three, from the item `at`. */
const set = (at: number, selects: boolean): RovingContext => ({
  at,
  count: ITEMS.length,
  focus: true,
  selects,
  wrap: false,
})

/** Runs roving focus over three named items, with a fake for focus. */
const rove = (context: RovingContext) => {
  const focus = fakeFocus<string>()
  setFocus(focus)
  const chosen: string[] = []
  const runner = run(
    roving,
    context,
    rovingHost<string>({
      items: () => ITEMS,
      select: (at) => chosen.push(`${at} with focus on ${focus.focused()}`),
    }),
    { ask: () => true, timers: fakeTimers() },
  )
  return { chosen, focus, runner }
}

describe('rovingHost', () => {
  test('moves focus to the item a key lands on', () => {
    const { chosen, focus, runner } = rove(set(0, false))
    runner.send(roving.EVENT_NEXT, undefined)
    expect(focus.focused()).toBe('second')
    expect(chosen).toEqual([])
  })

  test('chooses the item it lands on, after focusing it, where the set chooses on arrival', () => {
    const { chosen, runner } = rove(set(1, true))
    runner.send(roving.EVENT_LAST, undefined)
    expect(chosen).toEqual(['2 with focus on third'])
  })
})
