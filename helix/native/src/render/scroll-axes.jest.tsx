import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { Scrolled } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import * as capability from '../capabilities/scroll'
import type { Family } from '../style/form'
import { HelixTheme } from '../theme/helix-theme'
import { element } from './element'
import { ScrollArea } from './scroll'

const original = timers()

afterEach(() => {
  setTimers(original)
  jest.restoreAllMocks()
})

/* A sheet that scrolls both ways, as a wide table in a short frame does. */
const sheet: Family = {
  api: { events: [], props: [], states: [] },
  name: 'sheet',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['overflow', { text: 'auto' }]],
      specificity: [0, 1, 0],
      target: 'sheet',
      values: [],
      webOnly: false,
      when: [],
    },
  ],
  tag: 'helix-sheet',
  tree: [{ children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'sheet' }],
  version: '1.1',
}

const Sheet = element(sheet, () => ({ marks: [], parts: {} }))

/** The scroll views drawn, outermost first. */
const scrollViews = () => {
  const root = screen.root
  if (root === null) {
    return []
  }
  return [root, ...root.queryAll(() => true)].filter(
    (node) => typeof node.props.onMomentumScrollEnd === 'function',
  )
}

/** A scroll event at `x` and `y`. */
const at = (x: number, y: number) => ({ nativeEvent: { contentOffset: { x, y } } })

describe('a part that scrolls both ways', () => {
  test('is a scroll view across inside one down, the inner one drawn across', async () => {
    await render(
      <HelixTheme mode="light">
        <Sheet>
          <Text>Cells</Text>
        </Sheet>
      </HelixTheme>,
    )
    const [down, across] = scrollViews()
    expect(down?.props.horizontal).toBeFalsy()
    expect(across?.props.horizontal).toBe(true)
    expect(across?.props.nestedScrollEnabled).toBe(true)
  })

  test('stands at one offset made of both, and at the ends of each', async () => {
    const told = jest.spyOn(capability, 'scrolled')
    await render(
      <HelixTheme mode="light">
        <Sheet>
          <Text>Cells</Text>
        </Sheet>
      </HelixTheme>,
    )
    const [down, across] = scrollViews()
    if (down === undefined || across === undefined) {
      throw new Error('The sheet draws no pair of scroll views.')
    }
    await fireEvent.scroll(down, at(0, 50))
    await fireEvent.scroll(across, at(30, 0))
    expect(told.mock.calls.map(([, point]) => point)).toEqual([
      { x: 0, y: 50 },
      { x: 30, y: 50 },
    ])
  })
})

describe('ScrollArea', () => {
  test('tells the scroll capability where it stands, and settles at the end of a glide', async () => {
    setTimers(fakeTimers())
    const heard: Scrolled[] = []
    let stop = (): void => undefined
    await render(
      <ScrollArea
        ref={(node) => {
          if (node !== null) {
            stop = capability.nativeScroll.observe(node, (one) => heard.push(one))
          }
        }}
      >
        <Text>Page</Text>
      </ScrollArea>,
    )
    const [area] = scrollViews()
    if (area === undefined) {
      throw new Error('No scroll view is drawn.')
    }
    await fireEvent(area, 'layout', { nativeEvent: { layout: { height: 100, width: 100 } } })
    await fireEvent(area, 'contentSizeChange', 100, 400)
    await fireEvent(area, 'momentumScrollBegin', at(0, 100))
    await fireEvent.scroll(area, at(0, 300))
    await fireEvent(area, 'momentumScrollEnd', at(0, 300))
    stop()
    /* Its frame and its content each move an end as they are measured. */
    expect(heard.map(({ settled, y }) => ({ settled, y }))).toEqual([
      { settled: false, y: { end: true, start: true } },
      { settled: false, y: { end: false, start: true } },
      { settled: false, y: { end: true, start: false } },
      { settled: true, y: { end: true, start: false } },
    ])
  })
})
