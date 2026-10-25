import { afterEach, describe, expect, test } from 'bun:test'
import type { Dragged, DragSetup } from '../types.generated.js'
import { type FakeGesture, fakeGesture } from './fake.js'
import { gesture, setGesture } from './index.js'
import { serverGesture } from './server.js'

/** A part as a spec names one: any value stands for a platform's handle. */
interface Part {
  readonly name: string
}

const row: Part = { name: 'row' }
const other: Part = { name: 'other' }

/** A drag down a list, lifted past 4 pixels, with a stop between each pair of rows. */
const DOWN_THE_LIST: DragSetup = { axis: 'y', slop: 4, stops: [100, 200] }

/** A drag on `row` of a new fake, and the moments it hears. */
const dragged = (setup: DragSetup = DOWN_THE_LIST) => {
  const fake = fakeGesture<Part>()
  const heard: Dragged[] = []
  const stop = fake.drag(row, setup, (moved) => heard.push(moved))
  return { fake, heard, stop }
}

const kinds = (heard: readonly Dragged[]): string[] => heard.map((moved) => moved.kind)

/** The moment of each thing heard, with where the pointer was along the axis. */
const moments = (heard: readonly Dragged[]): string[] =>
  heard.map((moved) => `${moved.kind} ${moved.at}`)

/** A drag on `row` of `fake`, and the moments it hears. */
const hear = (fake: FakeGesture<Part>, setup: DragSetup = DOWN_THE_LIST) => {
  const heard: Dragged[] = []
  const stop = fake.drag(row, setup, (moved) => heard.push(moved))
  return { heard, stop }
}

afterEach(() => {
  setGesture(serverGesture)
})

describe('gesture', () => {
  test('is the server implementation until one is set', () => {
    expect(gesture()).toBe(serverGesture)
  })

  test('calls the implementation set last', () => {
    const fake = fakeGesture<Part>()
    setGesture(fake)
    const heard: Dragged[] = []
    gesture().drag(row, DOWN_THE_LIST, (moved) => heard.push(moved))
    fake.down(row, { x: 10, y: 50 })
    expect(kinds(heard)).toEqual(['down'])
  })

  test('hears nothing on the server', () => {
    const heard: Dragged[] = []
    const stop = serverGesture.drag(row, DOWN_THE_LIST, (moved) => heard.push(moved))
    expect(stop()).toBeUndefined()
    expect(heard).toEqual([])
  })
})

describe('fakeGesture', () => {
  test('tells down as a pointer goes down, with where it is and which pointer it is', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 }, 7)
    expect(heard).toEqual([{ at: 50, kind: 'down', pointer: 7, x: 10, y: 50 }])
  })

  test('reads the position along the axis the setup names', () => {
    const { fake, heard } = dragged({ axis: 'x', slop: 4, stops: [] })
    fake.down(row, { x: 10, y: 50 })
    expect(heard[0]?.at).toBe(10)
  })

  test('lifts once the pointer travels the slop in a straight line, and not before', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 12, y: 52 })
    expect(kinds(heard)).toEqual(['down'])
    /* Three along each axis, under the slop on either, and over four in a
       straight line, as core's reorder machine reads it. */
    fake.move(row, { x: 13, y: 53 })
    expect(kinds(heard)).toEqual(['down', 'lift'])
    expect(heard[1]).toEqual({ at: 53, kind: 'lift', pointer: 1, x: 13, y: 53 })
  })

  test('lifts once, however far the pointer goes after', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    fake.move(row, { x: 10, y: 70 })
    expect(kinds(heard)).toEqual(['down', 'lift'])
  })

  test('tells a pass each time the pointer crosses a stop, in either direction', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    fake.move(row, { x: 10, y: 150 })
    fake.move(row, { x: 10, y: 160 })
    fake.move(row, { x: 10, y: 90 })
    expect(kinds(heard)).toEqual(['down', 'lift', 'pass', 'pass'])
    expect(heard.slice(2).map((moved) => moved.at)).toEqual([150, 90])
  })

  test('tells a pass for each stop one move crosses', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    fake.move(row, { x: 10, y: 250 })
    expect(kinds(heard)).toEqual(['down', 'lift', 'pass', 'pass'])
  })

  test('passes a stop only once the pointer is past it', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 100 })
    expect(kinds(heard)).toEqual(['down', 'lift'])
    fake.move(row, { x: 10, y: 101 })
    expect(kinds(heard)).toEqual(['down', 'lift', 'pass'])
  })

  test('tells no pass before the lift, and at the lift tells the stops crossed since the pointer went down', () => {
    const { fake, heard } = dragged({ axis: 'y', slop: 4, stops: [100] })
    fake.down(row, { x: 10, y: 98 })
    fake.move(row, { x: 10, y: 101 })
    expect(kinds(heard)).toEqual(['down'])
    fake.move(row, { x: 10, y: 103 })
    expect(kinds(heard)).toEqual(['down', 'lift', 'pass'])
  })

  test('tells drop as the pointer goes up, where it last was', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 12, y: 120 })
    fake.up(row)
    expect(heard.at(-1)).toEqual({ at: 120, kind: 'drop', pointer: 1, x: 12, y: 120 })
  })

  test('tells drop for a press that never lifted, so a host can tell a click', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.up(row)
    expect(kinds(heard)).toEqual(['down', 'drop'])
  })

  test('tells cancel as the system takes the pointer, where it last was', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 80 })
    fake.cancel(row)
    expect(heard.at(-1)).toEqual({ at: 80, kind: 'cancel', pointer: 1, x: 10, y: 80 })
  })

  test('hears only the pointer that went down, until it goes up', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 }, 1)
    fake.down(row, { x: 90, y: 50 }, 2)
    fake.move(row, { x: 10, y: 80 })
    fake.up(row)
    expect(heard.map((moved) => `${moved.kind} ${moved.pointer}`)).toEqual([
      'down 1',
      'lift 1',
      'drop 1',
    ])
  })

  test('starts again with the next pointer down', () => {
    const { fake, heard } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.up(row)
    fake.down(row, { x: 10, y: 60 }, 2)
    expect(heard.map((moved) => `${moved.kind} ${moved.pointer}`)).toEqual([
      'down 1',
      'drop 1',
      'down 2',
    ])
  })

  test('tells cancel when stopped during a drag, and nothing after', () => {
    const { fake, heard, stop } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 70 })
    stop()
    fake.move(row, { x: 10, y: 150 })
    fake.up(row)
    expect(kinds(heard)).toEqual(['down', 'lift', 'cancel'])
    expect(fake.listening(row)).toBe(0)
  })

  test('tells nothing when stopped with no pointer down', () => {
    const { fake, heard, stop } = dragged()
    stop()
    fake.down(row, { x: 10, y: 50 })
    expect(heard).toEqual([])
  })

  test('tells none of the rest of a move to a listener that stops while it hears one', () => {
    const fake = fakeGesture<Part>()
    const heard: string[] = []
    const stop = fake.drag(row, DOWN_THE_LIST, (moved) => {
      heard.push(moved.kind)
      if (moved.kind === 'lift') {
        stop()
      }
    })
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 250 })
    expect(heard).toEqual(['down', 'lift', 'cancel'])
  })

  test('keeps each moment it tells in order, with the part it was told for', () => {
    const { fake } = dragged()
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    expect(fake.told.map(({ moved, node }) => `${node.name} ${moved.kind}`)).toEqual([
      'row down',
      'row lift',
    ])
  })

  test('drives only the part the pointer is on', () => {
    const fake = fakeGesture<Part>()
    const heard: Dragged[] = []
    fake.drag(row, DOWN_THE_LIST, (moved) => heard.push(moved))
    fake.down(other, { x: 10, y: 50 })
    fake.move(other, { x: 10, y: 80 })
    expect(heard).toEqual([])
    expect(fake.told).toEqual([])
  })
})

describe('fakeGesture with a later drag of the same part', () => {
  /** A drag down a list whose places begin at 100, 140, and 180, as the native driver's spec has. */
  const PLACES: DragSetup = { axis: 'y', slop: 4, stops: [100, 140, 180] }

  test('hears the part with the setup and the listener of the latest drag alone', () => {
    const fake = fakeGesture<Part>()
    const earlier = hear(fake, { axis: 'x', slop: 20, stops: [] })
    const later = hear(fake)
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    expect(earlier.heard).toEqual([])
    expect(kinds(later.heard)).toEqual(['down', 'lift'])
    expect(fake.listening(row)).toBe(1)
  })

  test('carries a press on into a later drag of the part, which passes the later stops', () => {
    const fake = fakeGesture<Part>()
    const earlier = hear(fake, PLACES)
    fake.down(row, { x: 0, y: 90 })
    fake.move(row, { x: 0, y: 96 })
    fake.move(row, { x: 0, y: 120 })
    /* The places moved 30 up under the pointer, as a scroll moves them. */
    const later = hear(fake, { ...PLACES, stops: [70, 110, 150] })
    fake.move(row, { x: 0, y: 145 })
    fake.move(row, { x: 0, y: 155 })
    fake.up(row)
    expect(moments(earlier.heard)).toEqual(['down 90', 'lift 96', 'pass 120'])
    expect(moments(later.heard)).toEqual(['pass 155', 'drop 155'])
    expect(later.heard[0]?.pointer).toBe(earlier.heard[0]?.pointer)
  })

  test('lifts a press heard again before it lifted with each later stop crossed since it went down', () => {
    const fake = fakeGesture<Part>()
    const earlier = hear(fake, { ...PLACES, stops: [200] })
    fake.down(row, { x: 0, y: 90 })
    fake.move(row, { x: 0, y: 92 })
    const later = hear(fake, { ...PLACES, stops: [91] })
    fake.move(row, { x: 0, y: 95 })
    expect(moments(earlier.heard)).toEqual(['down 90'])
    expect(moments(later.heard)).toEqual(['lift 95', 'pass 95'])
  })

  test('tells none of the rest of a move to a listener that hears the part again while it hears a pass', () => {
    const fake = fakeGesture<Part>()
    const earlier: Dragged[] = []
    const later: Dragged[] = []
    fake.drag(row, DOWN_THE_LIST, (moved) => {
      earlier.push(moved)
      if (moved.kind === 'pass') {
        fake.drag(row, { ...DOWN_THE_LIST, stops: [300] }, (one) => later.push(one))
      }
    })
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    fake.move(row, { x: 10, y: 250 })
    fake.move(row, { x: 10, y: 310 })
    expect(moments(earlier)).toEqual(['down 50', 'lift 60', 'pass 250'])
    expect(moments(later)).toEqual(['pass 310'])
  })

  test('does nothing when the stop of a drag that was replaced runs, during a press or after it', () => {
    const fake = fakeGesture<Part>()
    const earlier = hear(fake)
    const later = hear(fake)
    fake.down(row, { x: 10, y: 50 })
    earlier.stop()
    fake.move(row, { x: 10, y: 60 })
    fake.up(row)
    earlier.stop()
    expect(earlier.heard).toEqual([])
    expect(kinds(later.heard)).toEqual(['down', 'lift', 'drop'])
    expect(fake.listening(row)).toBe(1)
    later.stop()
    expect(fake.listening(row)).toBe(0)
  })

  test('leaves a drag that began after a stop alone when an older stop runs', () => {
    const fake = fakeGesture<Part>()
    const first = hear(fake)
    const second = hear(fake)
    second.stop()
    const third = hear(fake)
    first.stop()
    second.stop()
    fake.down(row, { x: 10, y: 50 })
    expect(kinds(third.heard)).toEqual(['down'])
    expect(fake.listening(row)).toBe(1)
  })

  test('begins a drag after a stop with no press', () => {
    const fake = fakeGesture<Part>()
    const earlier = hear(fake)
    fake.down(row, { x: 10, y: 50 })
    fake.move(row, { x: 10, y: 60 })
    earlier.stop()
    const later = hear(fake)
    fake.move(row, { x: 10, y: 150 })
    fake.up(row)
    expect(later.heard).toEqual([])
    fake.down(row, { x: 10, y: 50 }, 2)
    expect(kinds(earlier.heard)).toEqual(['down', 'lift', 'cancel'])
    expect(later.heard.map((moved) => `${moved.kind} ${moved.pointer}`)).toEqual(['down 2'])
  })
})
