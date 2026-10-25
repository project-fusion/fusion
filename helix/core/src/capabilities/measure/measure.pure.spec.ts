import { afterEach, describe, expect, test } from 'bun:test'
import type { Rect } from '../types.generated.js'
import { fakeMeasure } from './fake.js'
import { measure, setMeasure } from './index.js'
import { serverMeasure } from './server.js'

/** A part as a spec names one: any value stands for a platform's handle. */
interface Part {
  readonly name: string
}

const panel: Part = { name: 'panel' }
const trigger: Part = { name: 'trigger' }

const BOX: Rect = { height: 40, width: 120, x: 10, y: 20 }

afterEach(() => {
  setMeasure(serverMeasure)
})

describe('measure', () => {
  test('is the server implementation until one is set', () => {
    expect(measure()).toBe(serverMeasure)
  })

  test('calls the implementation set last', () => {
    const fake = fakeMeasure<Part>()
    fake.place(panel, BOX)
    setMeasure(fake)
    expect(measure().box(panel)).toEqual(BOX)
  })

  test('has no box and hears nothing on the server', () => {
    const heard: Rect[] = []
    const stop = serverMeasure.observe(panel, (box) => heard.push(box))
    expect(serverMeasure.box(panel)).toBeNull()
    expect(stop()).toBeUndefined()
    expect(heard).toEqual([])
  })
})

describe('fakeMeasure', () => {
  test('has no box for a node before one is placed, and none after it is taken away', () => {
    const fake = fakeMeasure<Part>()
    expect(fake.box(panel)).toBeNull()
    fake.place(panel, BOX)
    expect(fake.box(panel)).toEqual(BOX)
    fake.place(panel, null)
    expect(fake.box(panel)).toBeNull()
  })

  test('calls the observers of the node a box is placed on', () => {
    const fake = fakeMeasure<Part>()
    const heard: Rect[] = []
    fake.observe(panel, (box) => heard.push(box))
    fake.place(trigger, BOX)
    fake.place(panel, BOX)
    expect(heard).toEqual([BOX])
  })

  test('calls observers each time the size changes, and only then', () => {
    const fake = fakeMeasure<Part>()
    const heard: Rect[] = []
    fake.observe(panel, (box) => heard.push(box))
    fake.place(panel, BOX)
    fake.place(panel, { ...BOX, x: 90 })
    fake.place(panel, { ...BOX, width: 200 })
    expect(heard.map((box) => box.width)).toEqual([120, 200])
  })

  test('stops calling an observer once it is stopped, and leaves the others', () => {
    const fake = fakeMeasure<Part>()
    const heard: string[] = []
    const changed = (): void => {
      heard.push('changed')
    }
    const first = fake.observe(panel, changed)
    fake.observe(panel, changed)
    expect(fake.observers(panel)).toBe(2)
    first()
    first()
    expect(fake.observers(panel)).toBe(1)
    fake.place(panel, BOX)
    expect(heard).toEqual(['changed'])
  })
})
