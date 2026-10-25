import { afterEach, describe, expect, test } from 'bun:test'
import { fakeEnvironment } from '../../capabilities/environment/fake.js'
import { setEnvironment } from '../../capabilities/environment/index.js'
import { serverEnvironment } from '../../capabilities/environment/server.js'
import { fakeMeasure } from '../../capabilities/measure/fake.js'
import { setMeasure } from '../../capabilities/measure/index.js'
import { serverMeasure } from '../../capabilities/measure/server.js'
import { fakeMotion } from '../../capabilities/motion/fake.js'
import { setMotion } from '../../capabilities/motion/index.js'
import { serverMotion } from '../../capabilities/motion/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import type { Frame, Rect } from '../../capabilities/types.generated.js'
import { type Runner, run } from '../runner.js'
import { type IndicatorParts, indicatorHost } from './host.js'
import * as indicator from './indicator.generated.js'
import type { IndicatorContext, IndicatorInput, Placement } from './machine.js'

afterEach(() => {
  setEnvironment(serverEnvironment)
  setMeasure(serverMeasure)
  setMotion(serverMotion)
})

/** A box in the viewport, as the measure capability reads one. */
const box = (x: number, y: number, width: number, height: number): Rect => ({
  height,
  width,
  x,
  y,
})

/** A mark never placed. */
const UNPLACED: IndicatorContext = {
  asked: 0,
  at: null,
  reduced: false,
  shown: false,
  token: 0,
  travel: 0,
}

const EMPHASIZED = { duration: 250, easing: 'emphasized' } as const

/** A line two high under the item: its width, and its own height at the item's bottom edge. */
const line = (at: Placement): Frame => ({ width: at.inline, x: at.x, y: at.y + at.block - 2 })

/**
 * Runs an indicator whose mark is placed against a strip at 16 across and
 * 100 down, holding the tabs `a`, `b`, and `c`, 60 by 32 at 4 inside it and 4
 * apart, with `b` chosen. `said` keeps each show, hide, and landing, in order,
 * and `asked` the parts each measurement asks for.
 */
const indicating = (
  context: IndicatorContext = UNPLACED,
  overrides: Partial<IndicatorParts<string>> = {},
) => {
  const boxes = fakeMeasure<string>()
  const moves = fakeMotion<string>()
  setMeasure(boxes)
  setMotion(moves)
  boxes.place('strip', box(16, 100, 300, 40))
  boxes.place('a', box(20, 104, 60, 32))
  boxes.place('b', box(84, 104, 60, 32))
  boxes.place('c', box(148, 104, 60, 32))
  const timers = fakeTimers()
  const said: string[] = []
  const at: { chosen: string | null; mark: string | null } = { chosen: 'b', mark: 'mark' }
  const runner: Runner<IndicatorContext, IndicatorInput> = run(
    indicator,
    context,
    indicatorHost<string>({
      chosen: () => at.chosen,
      edges: () => ({ borderLeft: 0, borderTop: 0, direction: 'ltr' }),
      frame: line,
      landed: (token) => {
        said.push(`landed ${token}`)
        runner.send(indicator.EVENT_LANDED, { token })
      },
      mark: () => at.mark,
      measured: (measurement, token) =>
        runner.send(indicator.EVENT_MEASURED, { measurement, token }),
      show: (shown) => said.push(shown ? 'show' : 'hide'),
      surface: () => 'strip',
      transition: () => EMPHASIZED,
      ...overrides,
    }),
    { ask: () => true, timers },
  )
  /* Tells the machine the chosen item may have moved, as a host does for a choice or a resize. */
  const change = (chosen = at.chosen): void => {
    at.chosen = chosen
    runner.send(indicator.EVENT_CHANGE, {})
  }
  return {
    at,
    boxes,
    change,
    moves,
    runner,
    said,
    state: () => indicator.STATES[runner.state()],
    timers,
  }
}

/** An indicator whose mark was placed on `b`, and is now on its way to `c`. */
const gliding = () => {
  const one = indicating()
  one.change()
  one.change('c')
  return one
}

/* Where the line under `b` and under `c` is drawn, against the strip. */
const UNDER_B: Frame = { width: 60, x: 68, y: 34 }
const UNDER_C: Frame = { width: 60, x: 132, y: 34 }

describe('indicatorHost', () => {
  test('places the mark where the chosen item is, with no travel, and shows it', () => {
    const { change, moves, said, state } = indicating()
    change()
    expect(moves.calls).toEqual([{ call: 'place', node: 'mark', to: UNDER_B }])
    expect(said).toEqual(['show'])
    expect(state()).toBe('placed')
  })

  test('measures against the surface’s border and direction', () => {
    const { change, moves } = indicating(UNPLACED, {
      edges: () => ({ borderLeft: 2, borderTop: 2, direction: 'rtl' }),
    })
    change()
    /* Right to left, from the strip's right edge at 316 to the tab's at 144, less the border. */
    expect(moves.where('mark')).toEqual({ width: 60, x: -170, y: 32 })
  })

  test('waits for the chosen item to be laid out, and draws nothing before it', () => {
    const { boxes, change, moves, said, state } = indicating()
    boxes.place('b', null)
    change()
    expect(moves.calls).toEqual([])
    expect(state()).toBe('unplaced')
    boxes.place('b', box(84, 104, 60, 32))
    change()
    expect(moves.where('mark')).toEqual(UNDER_B)
    expect(said).toEqual(['show'])
  })

  test('draws nothing where the surface is not laid out or the mark is not drawn', () => {
    const { at, boxes, change, moves, said, state } = indicating()
    boxes.place('strip', null)
    change()
    boxes.place('strip', box(16, 100, 300, 40))
    at.mark = null
    change()
    expect(moves.calls).toEqual([])
    expect(said).toEqual([])
    expect(state()).toBe('unplaced')
  })

  test('glides to a new choice along the family’s transition, and lands as the glide arrives', () => {
    const { moves, said, state, timers } = gliding()
    expect(moves.gliding('mark')).toEqual({ to: UNDER_C, transition: EMPHASIZED })
    expect(state()).toBe('moving')
    expect(timers.pending().timeouts).toBe(1)
    moves.arrive('mark')
    expect(said).toEqual(['show', 'show', 'landed 3'])
    expect(state()).toBe('placed')
    expect(timers.pending().timeouts).toBe(0)
  })

  test('lands at the deadline, leaves the glide going, and sends nothing when it arrives', () => {
    const { moves, said, state, timers } = gliding()
    timers.advance(1000)
    expect(state()).toBe('placed')
    expect(moves.gliding('mark')).not.toBeNull()
    moves.arrive('mark')
    expect(moves.where('mark')).toEqual(UNDER_C)
    expect(said).toEqual(['show', 'show'])
  })

  test('hides the mark where nothing is chosen, and leaves a glide under way going', () => {
    const { change, moves, said, state } = gliding()
    change(null)
    expect(said.at(-1)).toBe('hide')
    expect(moves.gliding('mark')).not.toBeNull()
    moves.arrive('mark')
    expect(said.at(-1)).toBe('landed 3')
    expect(state()).toBe('placed')
  })

  test('moves the end of a travel to a new size, under the same token, and lands once', () => {
    const { boxes, change, moves, said } = gliding()
    boxes.place('c', box(148, 104, 90, 32))
    change()
    expect(moves.calls.map(({ call }) => call)).toEqual(['place', 'glide', 'glide'])
    expect(moves.gliding('mark')?.to).toEqual({ ...UNDER_C, width: 90 })
    moves.arrive('mark')
    expect(said.filter((one) => one.startsWith('landed'))).toEqual(['landed 3'])
  })

  test('leaves a travel alone where a measurement finds it going to the same place', () => {
    const { change, moves } = gliding()
    change()
    expect(moves.calls.map(({ call }) => call)).toEqual(['place', 'glide'])
  })

  test('places a new choice at once where reduced motion is on', () => {
    const { change, moves, state } = indicating({ ...UNPLACED, reduced: true })
    change()
    change('c')
    expect(moves.calls.map(({ call }) => call)).toEqual(['place', 'place'])
    expect(moves.where('mark')).toEqual(UNDER_C)
    expect(state()).toBe('placed')
  })

  test('lands at once where the glide arrives at once', () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const { said, state, timers } = gliding()
    expect(said).toEqual(['show', 'landed 3', 'show'])
    expect(state()).toBe('placed')
    expect(timers.pending().timeouts).toBe(0)
  })
})
