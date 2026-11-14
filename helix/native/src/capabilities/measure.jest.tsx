import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { createRef } from 'react'
import { type HostInstance, View } from 'react-native'
import { layoutChanged, nativeMeasure } from './measure'

type Rect = NonNullable<ReturnType<typeof nativeMeasure.box>>

/**
 * Draws a view and hands back its host instance, with the rectangle it reads
 * and whether it is in the tree.
 *
 * **React Native's Jest preset draws a view as a mock with `measure` and
 * `focus` and none of the element methods**, so the spec gives the instance
 * the two that `box` reads.
 */
const drawn = async (rect: Rect, connected = true) => {
  const ref = createRef<HostInstance>()
  await render(<View ref={ref} />)
  const rectangle = jest.fn(() => rect)
  const node = Object.assign(ref.current as HostInstance, {
    getBoundingClientRect: rectangle,
    isConnected: connected,
  })
  return { node, rectangle }
}

const BOX: Rect = { height: 44, width: 300, x: 16, y: 120 }

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeMeasure', () => {
  test('reads the box from the host instance’s getBoundingClientRect', async () => {
    const { node, rectangle } = await drawn(BOX)
    expect(nativeMeasure.box(node)).toEqual(BOX)
    expect(rectangle).toHaveBeenCalledTimes(1)
  })

  test('reads no box for a node out of the tree', async () => {
    const { node, rectangle } = await drawn(BOX, false)
    expect(nativeMeasure.box(node)).toBeNull()
    expect(rectangle).not.toHaveBeenCalled()
  })

  test('tells an observer the box each time onLayout reports a new size', async () => {
    const { node } = await drawn(BOX)
    const told: Rect[] = []
    const stop = nativeMeasure.observe(node, (box) => told.push(box))
    layoutChanged(node, { height: 44, width: 300, x: 0, y: 0 })
    layoutChanged(node, { height: 88, width: 300, x: 0, y: 0 })
    expect(told).toEqual([BOX, BOX])
    stop()
  })

  test('passes on no layout that only moves the view', async () => {
    const { node } = await drawn(BOX)
    const told: Rect[] = []
    const stop = nativeMeasure.observe(node, (box) => told.push(box))
    layoutChanged(node, { height: 44, width: 300, x: 0, y: 0 })
    layoutChanged(node, { height: 44, width: 300, x: 8, y: 30 })
    expect(told).toHaveLength(1)
    stop()
  })

  test('stops one observer and keeps the others, with the same callback observed twice', async () => {
    const { node } = await drawn(BOX)
    const told: Rect[] = []
    const changed = (box: Rect): void => {
      told.push(box)
    }
    const first = nativeMeasure.observe(node, changed)
    const second = nativeMeasure.observe(node, changed)
    first()
    layoutChanged(node, { height: 44, width: 300, x: 0, y: 0 })
    expect(told).toHaveLength(1)
    second()
    layoutChanged(node, { height: 60, width: 300, x: 0, y: 0 })
    expect(told).toHaveLength(1)
  })
})
