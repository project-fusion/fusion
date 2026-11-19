import { describe, expect, test } from 'bun:test'
import { heldInside, levelsOf, ScaleMemory } from './levels.js'

describe('the levels of a scale that changed', () => {
  test('are the ticks alone where there was no scale before', () => {
    expect(levelsOf([0, 1000])).toEqual(
      [0, 200, 400, 600, 800, 1000].map((level) => ({ leaving: false, level })),
    )
  })

  test('keep the levels both scales rule, add the new, and mark the dropped as leaving', () => {
    const levels = levelsOf([0, 400], [0, 1000])
    expect(levels.filter((one) => !one.leaving).map((one) => one.level)).toEqual([
      0, 100, 200, 300, 400,
    ])
    expect(levels.filter((one) => one.leaving).map((one) => one.level)).toEqual([600, 800, 1000])
  })

  /* A keyed list moves no element it keeps where both lists are in the same
     order, and an element moved in the document starts its style afresh. */
  test('come in order of value, the leaving among the rest', () => {
    const levels = levelsOf([0, 1000], [0, 300]).map((one) => one.level)
    expect(levels).toEqual([...levels].sort((one, other) => one - other))
    expect(levels).toContain(50)
  })
})

describe('the scale drawn before', () => {
  test('is nothing on the first drawing', () => {
    expect(new ScaleMemory().before([0, 10])).toBeUndefined()
  })

  test('is held while the scale stays, so a drawing for the pointer keeps the fade going', () => {
    const memory = new ScaleMemory()
    memory.before([0, 10])
    expect(memory.before([0, 20])).toEqual([0, 10])
    expect(memory.before([0, 20])).toEqual([0, 10])
    expect(memory.before([0, 5])).toEqual([0, 20])
  })
})

describe('a leaving level', () => {
  test('stands inside the plot, at the end it left from', () => {
    expect(heldInside(-250)).toBe(0)
    expect(heldInside(40)).toBe(40)
    expect(heldInside(180)).toBe(100)
  })
})
