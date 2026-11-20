import { afterEach, describe, expect, test } from 'bun:test'
import { fakeForm } from '../../capabilities/form/fake.js'
import { setForm } from '../../capabilities/form/index.js'
import { serverForm } from '../../capabilities/form/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { run } from '../runner.js'
import { toggleHost } from './host.js'
import type { ToggleContext } from './machine.js'
import * as toggle from './toggle.generated.js'

afterEach(() => {
  setForm(serverForm)
})

const OFF: ToggleContext = { checked: false, disabled: false, mixed: false, readOnly: false }

/**
 * Runs a toggle on the control `box`, with a platform that accepts each
 * request where `accepts`. `asked` keeps each request with the state it
 * proposes, `changed` each state the family is told of, and `values` what
 * the form was given.
 */
const turn = (context: ToggleContext, accepts = true) => {
  const values = fakeForm<string>()
  setForm(values)
  const asked: string[] = []
  const changed: boolean[] = []
  const runner = run(
    toggle,
    context,
    toggleHost({
      change: (checked) => changed.push(checked),
      control: () => 'box',
      value: () => 'yes',
    }),
    {
      ask: (events, proposed) => {
        asked.push(...events.map((event) => `${event} ${proposed.checked}`))
        return accepts
      },
      timers: fakeTimers(),
    },
  )
  return { asked, changed, runner, values: values.values }
}

describe('toggleHost', () => {
  /* checkbox-root.dom.spec.ts, "changing announces before it acts", and
     "announces a boolean": the request carries the state it would leave. */
  test('asks with the state a press proposes, then tells the family the state it took', () => {
    const { asked, changed, runner } = turn(OFF)
    runner.send(toggle.EVENT_PRESS, undefined)
    runner.send(toggle.EVENT_PRESS, undefined)
    expect(asked).toEqual(['toggle true', 'toggle false'])
    expect(changed).toEqual([true, false])
  })

  test('tells the family nothing where a listener refuses the press', () => {
    const { asked, changed, runner } = turn(OFF, false)
    runner.send(toggle.EVENT_PRESS, undefined)
    expect(asked).toEqual(['toggle true'])
    expect(changed).toEqual([])
    expect(runner.context().checked).toBe(false)
  })

  /* switch-root.dom.spec.ts, "off submits nothing rather than a blank". */
  test('gives the form the value while checked, and no value while not, from the mount on', () => {
    const { runner, values } = turn(OFF)
    runner.mount()
    runner.send(toggle.EVENT_PRESS, undefined)
    runner.send(toggle.EVENT_PRESS, undefined)
    expect(values).toEqual([
      { node: 'box', value: null },
      { node: 'box', value: 'yes' },
      { node: 'box', value: null },
    ])
  })

  /* checkbox-root.ts reports `checked` whatever `indeterminate` says. */
  test('gives the form the state under the dash while mixed', () => {
    const { runner, values } = turn({ ...OFF, checked: true, mixed: true })
    runner.mount()
    expect(values).toEqual([{ node: 'box', value: 'yes' }])
  })

  test('asks nothing and tells nothing while read-only or disabled', () => {
    for (const context of [
      { ...OFF, readOnly: true },
      { ...OFF, disabled: true },
    ]) {
      const { asked, changed, runner } = turn(context)
      runner.send(toggle.EVENT_PRESS, undefined)
      expect([asked, changed, runner.context()]).toEqual([[], [], context])
    }
  })

  test('tells the family nothing once stopped', () => {
    const { asked, changed, runner } = turn(OFF)
    runner.stop()
    runner.send(toggle.EVENT_PRESS, undefined)
    expect([asked, changed]).toEqual([[], []])
  })
})
