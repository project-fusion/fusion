/**
 * Where a list stands over its trigger: the option it opened on where the
 * trigger is, in points from the layer host, as the web's core `over` gives.
 */
import { overAt } from './layer-over'

const frame = { height: 874, rtl: false, width: 402 }
const origin = { x: 0, y: 0 }

describe('a list over its trigger', () => {
  test('stands the option on the trigger, by its middle', () => {
    const placed = overAt(
      [24, 300, 354, 40],
      [24, 0, 354, 114],
      { height: 32, top: 41 },
      frame,
      origin,
    )
    expect(placed).toEqual({ at: { left: 24, top: 263 }, width: 354 })
  })

  test('stays inside the window near its top', () => {
    const placed = overAt(
      [24, 10, 354, 40],
      [24, 0, 354, 114],
      { height: 32, top: 41 },
      frame,
      origin,
    )
    expect(placed.at.top).toBe(8)
  })

  test('is told from where the host stands', () => {
    const placed = overAt([24, 300, 354, 40], [24, 0, 354, 114], { height: 32, top: 41 }, frame, {
      x: 0,
      y: 20,
    })
    expect(placed.at.top).toBe(243)
  })
})
