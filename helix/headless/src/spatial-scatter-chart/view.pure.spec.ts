import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import type { Camera } from '@fusion.dev/helix-core'
import { boxView, DragTurn, type Frame, TICK_SIZE, wordsFitted } from './view.js'

const press = (x: number, y = 0): PointerEvent =>
  ({
    button: 0,
    clientX: x,
    clientY: y,
    currentTarget: null,
    pointerId: 1,
  }) as unknown as PointerEvent

/** A drag, its camera, and how many renders it asked for. */
const dragOf = (): { camera: () => Camera; drag: DragTurn; redraws: () => number } => {
  let camera: Camera = { tilt: 30, turn: 45 }
  let redraws = 0
  const drag = new DragTurn(
    (next) => {
      camera = next(camera)
    },
    () => {
      redraws += 1
    },
  )
  return { camera: () => camera, drag, redraws: () => redraws }
}

const resting: Frame = { height: 4, width: 10, x: -2, y: -1 }

afterEach(() => {
  ;(performance.now as unknown as { mockRestore?: () => void }).mockRestore?.()
})

describe('the frame a drag draws in', () => {
  test('at rest, it is the frame that fits the drawing', () => {
    const { drag } = dragOf()
    expect(drag.frame(resting, { x: 3, y: 1 })).toEqual(resting)
  })

  test('through a drag, it keeps its size, and the middle of the data where it stood', () => {
    const { camera, drag } = dragOf()
    drag.frame(resting, { x: 3, y: 1 })
    drag.down(press(0))
    drag.move(press(40))
    expect(camera().turn).not.toBe(45)
    /* The view turned, so the drawing fits a new frame, and its middle moved. */
    const held = drag.frame({ height: 7, width: 6, x: 5, y: 2 }, { x: 8, y: 4 })
    expect(held).toEqual({ height: 4, width: 10, x: 3, y: 2 })
    expect(held.x + 5).toBe(8)
  })

  test('once the drag ends, it settles into the frame that fits', () => {
    const clock = spyOn(performance, 'now').mockReturnValue(1000)
    const { drag, redraws } = dragOf()
    const fits: Frame = { height: 7, width: 6, x: 5, y: 2 }
    drag.frame(resting, { x: 3, y: 1 })
    drag.down(press(0))
    drag.move(press(40))
    const held = drag.frame(fits, { x: 8, y: 4 })
    expect(drag.up(press(40))).toBe(true)
    expect(redraws()).toBe(1)
    expect(drag.frame(fits, { x: 8, y: 4 })).toEqual(held)
    clock.mockReturnValue(1100)
    const between = drag.frame(fits, { x: 8, y: 4 })
    expect(between.width).toBeLessThan(held.width)
    expect(between.width).toBeGreaterThan(fits.width)
    clock.mockReturnValue(2000)
    expect(drag.frame(fits, { x: 8, y: 4 })).toEqual(fits)
  })

  test('a press that does not move holds nothing', () => {
    const { drag, redraws } = dragOf()
    drag.frame(resting, { x: 3, y: 1 })
    drag.down(press(0))
    drag.move(press(2))
    const fits: Frame = { height: 7, width: 6, x: 5, y: 2 }
    expect(drag.frame(fits, { x: 8, y: 4 })).toEqual(fits)
    expect(drag.up(press(2))).toBe(false)
    expect(redraws()).toBe(0)
  })
})

describe('the words of a box in a narrow plot', () => {
  const axis = { name: 'Reading', range: [0, 100], ticks: [0, 50, 100] } as never
  const camera: Camera = { tilt: 30, turn: 45 } as Camera
  const draw = (words: number) => boxView({ x: axis, y: axis, z: axis }, camera, [], false, words)

  test('stand at the font size of the box', () => {
    const room = { font: 12, height: 225, width: 310 }
    const view = wordsFitted(room, draw)
    const pixel = 1 / Math.min(room.width / view.bounds.width, room.height / view.bounds.height)
    expect((TICK_SIZE * view.words) / pixel).toBeGreaterThanOrEqual(11.5)
  })

  test('stay at their written size where nothing has measured the box', () => {
    expect(wordsFitted(undefined, draw).words).toBe(1)
  })

  test('hold their written size in a plot with room', () => {
    expect(wordsFitted({ font: 1, height: 2000, width: 2000 }, draw).words).toBe(1)
  })
})
