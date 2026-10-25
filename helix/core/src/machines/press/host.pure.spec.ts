import { describe, expect, test } from 'bun:test'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { pressHost } from './host.js'
import type { PressContext, PressInput } from './machine.js'
import * as press from './press.generated.js'

/** A part at rest that takes a press, and becomes a long press where it `holds`. */
const part = (holds = false): PressContext => ({
  disabled: false,
  held: false,
  holds,
  key: false,
  pending: false,
  pointer: '',
  pointerType: '',
  x: 0,
  y: 0,
})

/** An event's input, with the fields it reads given and the rest at rest. */
const input = (fields: Partial<PressInput>): PressInput => ({
  count: 0,
  key: '',
  over: false,
  pointer: '',
  primary: false,
  x: 0,
  y: 0,
  ...fields,
})

/**
 * Runs a press on a part, with a platform that accepts each click where
 * `accepts`. `asked` keeps each request, and `heard` each call to the
 * family, in the order they came.
 */
const pressing = (context: PressContext, accepts = true) => {
  const asked: string[] = []
  const heard: string[] = []
  const timers = fakeTimers()
  const runner = run(
    press,
    context,
    pressHost({
      act: () => heard.push('act'),
      hold: () => heard.push('hold'),
      press: (pointerType) => heard.push(`press ${pointerType}`),
    }),
    {
      ask: (events) => {
        asked.push(...events)
        return accepts
      },
      timers,
    },
  )
  return { asked, heard, runner, timers }
}

describe('pressHost', () => {
  test('acts, then tells the consumer a touch pressed the part, for a release over it', () => {
    const { asked, heard, runner } = pressing(part())
    runner.send(press.EVENT_POINTER_DOWN, input({ pointer: 'touch', primary: true }))
    runner.send(press.EVENT_POINTER_UP, input({ over: true, pointer: 'touch' }))
    expect(asked).toEqual(['click'])
    expect(heard).toEqual(['act', 'press touch'])
  })

  test('names the keyboard for Enter, and a script’s click as virtual', () => {
    const { heard, runner } = pressing(part())
    runner.send(press.EVENT_KEY_DOWN, input({ key: 'Enter' }))
    runner.send(press.EVENT_CLICK, input({}))
    expect(heard).toEqual(['act', 'press keyboard', 'act', 'press virtual'])
  })

  test('neither acts nor tells the consumer where a listener refuses the click', () => {
    const { asked, heard, runner } = pressing(part(), false)
    runner.send(press.EVENT_KEY_DOWN, input({ key: 'Enter' }))
    expect(asked).toEqual(['click'])
    expect(heard).toEqual([])
  })

  test('takes a long press for a pointer held still for half a second, and its release acts on nothing', () => {
    const { asked, heard, runner, timers } = pressing(part(true))
    runner.send(press.EVENT_POINTER_DOWN, input({ pointer: 'mouse', primary: true }))
    timers.advance(499)
    expect(heard).toEqual([])
    timers.advance(1)
    expect(heard).toEqual(['hold'])
    runner.send(press.EVENT_POINTER_UP, input({ over: true, pointer: 'mouse' }))
    expect(asked).toEqual([])
    expect(heard).toEqual(['hold'])
  })

  test('acts on nothing and takes no long press once stopped', () => {
    const { asked, heard, runner, timers } = pressing(part(true))
    runner.send(press.EVENT_POINTER_DOWN, input({ pointer: 'mouse', primary: true }))
    runner.stop()
    expect(timers.pending().timeouts).toBe(0)
    timers.advance(500)
    runner.send(press.EVENT_KEY_DOWN, input({ key: 'Enter' }))
    runner.send(press.EVENT_CLICK, input({ count: 1, pointer: 'mouse' }))
    expect(asked).toEqual([])
    expect(heard).toEqual([])
  })
})
