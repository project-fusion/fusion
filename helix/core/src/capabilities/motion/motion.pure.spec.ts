import { afterEach, describe, expect, test } from 'bun:test'
import { fakeEnvironment } from '../environment/fake.js'
import { setEnvironment } from '../environment/index.js'
import { serverEnvironment } from '../environment/server.js'
import type { Transition } from '../types.generated.js'
import { fakeMotion } from './fake.js'
import { motion, setMotion } from './index.js'
import { serverMotion } from './server.js'

/** A part as a spec names one: any value stands for a platform's handle. */
interface Part {
  readonly name: string
}

const row: Part = { name: 'row' }
const other: Part = { name: 'other' }

const SETTLE: Transition = { duration: 200, easing: 'decelerate' }

afterEach(() => {
  setMotion(serverMotion)
  setEnvironment(serverEnvironment)
})

describe('motion', () => {
  test('is the server implementation until one is set', () => {
    expect(motion()).toBe(serverMotion)
  })

  test('calls the implementation set last', () => {
    const fake = fakeMotion<Part>()
    setMotion(fake)
    motion().place(row, { y: 40 })
    expect(fake.calls).toEqual([{ call: 'place', node: row, to: { y: 40 } }])
  })

  test('draws nothing on the server, and a glide there arrives at once', () => {
    let arrived = 0
    expect(serverMotion.place(row, { x: 10 })).toBeUndefined()
    const stop = serverMotion.glide(row, { x: 10 }, SETTLE, () => {
      arrived += 1
    })
    expect(arrived).toBe(1)
    expect(stop()).toBeUndefined()
  })
})

describe('fakeMotion', () => {
  test('keeps each place and glide in the order asked', () => {
    const fake = fakeMotion<Part>()
    fake.place(row, { opacity: 0 })
    fake.glide(other, { y: 48 }, SETTLE, () => undefined)
    expect(fake.calls).toEqual([
      { call: 'place', node: row, to: { opacity: 0 } },
      { call: 'glide', node: other, to: { y: 48 }, transition: SETTLE },
    ])
  })

  test('draws a node where it is placed, keeping each field a place leaves out', () => {
    const fake = fakeMotion<Part>()
    expect(fake.where(row)).toEqual({})
    fake.place(row, { opacity: 1, x: 0, y: 0 })
    fake.place(row, { x: 12 })
    expect(fake.where(row)).toEqual({ opacity: 1, x: 12, y: 0 })
  })

  test('holds a glide where it started until a spec lands it, then calls it back', () => {
    const fake = fakeMotion<Part>()
    let arrived = 0
    fake.place(row, { y: 0 })
    fake.glide(row, { y: 48 }, SETTLE, () => {
      arrived += 1
    })
    expect(fake.where(row)).toEqual({ y: 0 })
    expect(fake.gliding(row)).toEqual({ to: { y: 48 }, transition: SETTLE })
    expect(arrived).toBe(0)
    fake.arrive(row)
    expect(fake.where(row)).toEqual({ y: 48 })
    expect(fake.gliding(row)).toBeNull()
    expect(arrived).toBe(1)
  })

  test('lands nothing on a node in no glide', () => {
    const fake = fakeMotion<Part>()
    fake.place(row, { y: 10 })
    fake.arrive(row)
    expect(fake.where(row)).toEqual({ y: 10 })
  })

  test('a stop ends the glide without calling it back, and leaves the node where it was', () => {
    const fake = fakeMotion<Part>()
    let arrived = 0
    const stop = fake.glide(row, { y: 48 }, SETTLE, () => {
      arrived += 1
    })
    stop()
    fake.arrive(row)
    expect(fake.gliding(row)).toBeNull()
    expect(fake.where(row)).toEqual({})
    expect(arrived).toBe(0)
  })

  test('a place ends the glide the node is in without calling it back', () => {
    const fake = fakeMotion<Part>()
    let arrived = 0
    fake.glide(row, { y: 48 }, SETTLE, () => {
      arrived += 1
    })
    fake.place(row, { y: 20 })
    fake.arrive(row)
    expect(fake.where(row)).toEqual({ y: 20 })
    expect(arrived).toBe(0)
  })

  test('a later glide ends the earlier one without calling it back, and a stop of the earlier one leaves it running', () => {
    const fake = fakeMotion<Part>()
    const arrived: string[] = []
    const first = fake.glide(row, { y: 48 }, SETTLE, () => arrived.push('first'))
    fake.glide(row, { y: 96 }, SETTLE, () => arrived.push('second'))
    first()
    fake.arrive(row)
    expect(arrived).toEqual(['second'])
    expect(fake.where(row)).toEqual({ y: 96 })
  })

  test('a glide arrives at once where the environment says the reader asks for reduced motion', () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const fake = fakeMotion<Part>()
    let arrived = 0
    fake.glide(row, { y: 48 }, SETTLE, () => {
      arrived += 1
    })
    expect(arrived).toBe(1)
    expect(fake.where(row)).toEqual({ y: 48 })
    expect(fake.gliding(row)).toBeNull()
    expect(fake.calls).toHaveLength(1)
  })

  test('a glide of no length arrives at once', () => {
    const fake = fakeMotion<Part>()
    let arrived = 0
    fake.glide(row, { y: 48 }, { duration: 0, easing: 'standard' }, () => {
      arrived += 1
    })
    expect(arrived).toBe(1)
    expect(fake.where(row)).toEqual({ y: 48 })
  })
})
