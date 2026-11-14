import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Dragged, DragSetup } from '../types.generated.js'
import { webGesture } from './web.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.body.replaceChildren()
})

/** A drag down a list, lifted past 4 pixels, with a stop between each pair of rows. */
const DOWN_THE_LIST: DragSetup = { axis: 'y', slop: 4, stops: [100, 200] }

/** A part in the document, removed after each spec. */
const part = (): HTMLElement => {
  const made = document.createElement('div')
  document.body.append(made)
  return made
}

/** Dispatches a pointer event of the main button on `node`, and returns it to read. */
const pointer = (
  node: Element,
  type: string,
  x: number,
  y: number,
  init: PointerEventInit = {},
): PointerEvent => {
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    ...init,
  })
  node.dispatchEvent(event)
  return event
}

/** A drag on `node`, and the moments it hears. */
const hear = (node: HTMLElement, setup: DragSetup = DOWN_THE_LIST) => {
  const heard: Dragged[] = []
  const stop = webGesture.drag(node, setup, (moved) => heard.push(moved))
  return { heard, stop }
}

/** A drag on a new part, and the moments it hears. */
const dragged = () => {
  const node = part()
  return { node, ...hear(node) }
}

const kinds = (heard: readonly Dragged[]): string[] => heard.map((moved) => moved.kind)

/** The moment of each thing heard, with where the pointer was along the axis. */
const moments = (heard: readonly Dragged[]): string[] =>
  heard.map((moved) => `${moved.kind} ${moved.at}`)

describe('webGesture', () => {
  test('tells down, lift, each pass, and drop from the pointer events, in client coordinates', () => {
    const { heard, node } = dragged()
    pointer(node, 'pointerdown', 10, 90)
    pointer(node, 'pointermove', 11, 93)
    pointer(node, 'pointermove', 10, 95)
    pointer(node, 'pointermove', 10, 150)
    pointer(node, 'pointermove', 10, 250)
    pointer(node, 'pointermove', 10, 150)
    pointer(node, 'pointerup', 12, 150)
    expect(heard.map((moved) => `${moved.kind} ${moved.at}`)).toEqual([
      'down 90',
      'lift 95',
      'pass 150',
      'pass 250',
      'pass 150',
      'drop 150',
    ])
    expect(heard[0]).toEqual({ at: 90, kind: 'down', pointer: 1, x: 10, y: 90 })
    expect(heard.at(-1)).toEqual({ at: 150, kind: 'drop', pointer: 1, x: 12, y: 150 })
  })

  test('lifts past the slop along the other axis too', () => {
    const { heard, node } = dragged()
    pointer(node, 'pointerdown', 10, 50)
    pointer(node, 'pointermove', 15, 50)
    expect(kinds(heard)).toEqual(['down', 'lift'])
  })

  test('takes the pointer as it goes down, and prevents the default', () => {
    const { node } = dragged()
    const down = pointer(node, 'pointerdown', 10, 50, { pointerId: 4 })
    expect(node.hasPointerCapture(4)).toBe(true)
    expect(down.defaultPrevented).toBe(true)
  })

  test('hears a pointer that goes down on something inside the part', () => {
    const { heard, node } = dragged()
    const grip = document.createElement('span')
    node.append(grip)
    pointer(grip, 'pointerdown', 10, 50)
    expect(kinds(heard)).toEqual(['down'])
  })

  test('tells cancel on pointercancel, where the pointer last was', () => {
    const { heard, node } = dragged()
    pointer(node, 'pointerdown', 10, 50)
    pointer(node, 'pointermove', 10, 80)
    pointer(node, 'pointercancel', 0, 0)
    expect(heard.at(-1)).toEqual({ at: 80, kind: 'cancel', pointer: 1, x: 10, y: 80 })
  })

  test('leaves a button other than the main one alone', () => {
    const { heard, node } = dragged()
    const down = pointer(node, 'pointerdown', 10, 50, { button: 2 })
    expect(heard).toEqual([])
    expect(down.defaultPrevented).toBe(false)
  })

  test('hears only the pointer that went down', () => {
    const { heard, node } = dragged()
    pointer(node, 'pointerdown', 10, 50, { pointerId: 1 })
    const second = pointer(node, 'pointerdown', 90, 50, { pointerId: 2 })
    pointer(node, 'pointermove', 90, 150, { pointerId: 2 })
    pointer(node, 'pointerup', 90, 150, { pointerId: 2 })
    expect(kinds(heard)).toEqual(['down'])
    expect(second.defaultPrevented).toBe(false)
  })

  test('tells cancel when stopped during a drag, gives the pointer back, and hears nothing after', () => {
    const { heard, node, stop } = dragged()
    pointer(node, 'pointerdown', 10, 50)
    pointer(node, 'pointermove', 10, 70)
    stop()
    expect(node.hasPointerCapture(1)).toBe(false)
    pointer(node, 'pointermove', 10, 150)
    pointer(node, 'pointerup', 10, 150)
    pointer(node, 'pointerdown', 10, 50)
    expect(kinds(heard)).toEqual(['down', 'lift', 'cancel'])
  })
})

describe('webGesture with a later drag of the same part', () => {
  /** A drag down a list whose places begin at 100, 140, and 180, as the native driver's spec has. */
  const PLACES: DragSetup = { axis: 'y', slop: 4, stops: [100, 140, 180] }

  test('carries a press on into a later drag of the part, which passes the later stops and keeps the pointer', () => {
    const node = part()
    const earlier = hear(node, PLACES)
    pointer(node, 'pointerdown', 0, 90)
    pointer(node, 'pointermove', 0, 96)
    pointer(node, 'pointermove', 0, 120)
    /* The places moved 30 up under the pointer, as a scroll moves them. */
    const later = hear(node, { ...PLACES, stops: [70, 110, 150] })
    pointer(node, 'pointermove', 0, 145)
    pointer(node, 'pointermove', 0, 155)
    expect(node.hasPointerCapture(1)).toBe(true)
    pointer(node, 'pointerup', 0, 155)
    expect(moments(earlier.heard)).toEqual(['down 90', 'lift 96', 'pass 120'])
    expect(moments(later.heard)).toEqual(['pass 155', 'drop 155'])
    expect(later.heard[0]?.pointer).toBe(earlier.heard[0]?.pointer)
  })

  test('does nothing when the stop of a drag that was replaced runs, and keeps the pointer', () => {
    const node = part()
    const earlier = hear(node)
    pointer(node, 'pointerdown', 10, 50)
    const later = hear(node)
    earlier.stop()
    expect(node.hasPointerCapture(1)).toBe(true)
    pointer(node, 'pointermove', 10, 60)
    pointer(node, 'pointerup', 10, 60)
    expect(kinds(earlier.heard)).toEqual(['down'])
    expect(kinds(later.heard)).toEqual(['lift', 'drop'])
  })

  test('leaves a drag that began after a stop alone when an older stop runs', () => {
    const node = part()
    const first = hear(node)
    const second = hear(node)
    second.stop()
    const third = hear(node)
    first.stop()
    second.stop()
    pointer(node, 'pointerdown', 10, 50)
    pointer(node, 'pointermove', 10, 60)
    expect(kinds(third.heard)).toEqual(['down', 'lift'])
    expect([first.heard, second.heard]).toEqual([[], []])
  })
})
