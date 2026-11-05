/*
 * The generated Heatmap, drawn from its real intermediate form: a table read
 * by its id drawn as cells core places down each column and then across, in
 * each cell's tone, the newest whole columns a narrow strip keeps, the words
 * in place of the cells, the footer's slots, the reading a finger and a key
 * move with the events each move sends, the cell drawn again over the rest,
 * and a selection under `selection-mode`. `test:native` writes the component
 * beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions, StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { publishChartSource } from '../render/chart-sources'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixHeatmap, type HelixHeatmapProps } from './heatmap/index.native'

let keys: FakeKeys<unknown>
let listening: unknown[]

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, heard) => {
      listening.push(node)
      return fake.listen(node, heard)
    },
  }
  setKeys(keys)
})

/** Fourteen days from June 1, 2026, each a count, the eleventh marked danger, under the id `days`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('days', {
        caption: 'Commits',
        rows: empty
          ? []
          : Array.from({ length: 14 }, (_, at) => ({
              cells: [
                {
                  name: 'Commits',
                  text: String(at % 5),
                  value: at % 5,
                  ...(at === 10 ? { tone: 'danger' } : {}),
                },
              ],
              label: `${at + 1} Jun`,
              when: `2026-06-${String(at + 1).padStart(2, '0')}`,
            })),
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  children,
  ...props
}: HelixHeatmapProps & { readonly blank?: boolean; readonly children?: React.ReactNode }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixHeatmap for="days" {...props}>
          {children}
        </HelixHeatmap>
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

type Styled = { readonly left?: unknown; readonly top?: unknown; readonly backgroundColor?: string }

/** The cells drawn, each a view standing where core placed it, in its paint. */
const cells = () =>
  (
    screen.root?.queryAll((node) => {
      if (typeof node.type !== 'string') {
        return false
      }
      const style = StyleSheet.flatten(node.props.style) as Styled | undefined
      return typeof style?.left === 'number' && style.backgroundColor !== undefined
    }) ?? []
  ).map((node) => StyleSheet.flatten(node.props.style) as Required<Styled>)

/** The strip a screen reader reaches as one control. */
const strip = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no strip is drawn')
  }
  return found
}

/** The host laid out `width` points wide, which says how many columns fit. */
const hostWide = async (width: number) => {
  const host = screen.root?.queryAll(
    (node) =>
      typeof node.props.onLayout === 'function' &&
      (StyleSheet.flatten(node.props.style) as { alignItems?: string } | undefined)?.alignItems ===
        'flex-start',
  )[0]
  await act(async () => {
    fireEvent(host as never, 'layout', {
      nativeEvent: { layout: { height: 40, width, x: 0, y: 0 } },
    })
  })
}

/** The strip laid out at the size it asks for. */
const layOut = async (width: number, height: number) => {
  await act(async () => {
    fireEvent(strip(), 'layout', { nativeEvent: { layout: { height, width, x: 0, y: 0 } } })
  })
}

/** The press and the drag the strip's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = strip().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** A tap on the strip at `x` and `y` points. */
const tapAt = async (x: number, y: number) => {
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ])
  })
}

/** A key pressed on the strip, as a hardware keyboard sends it, with Shift where asked. */
const key = async (name: string, shift = false) => {
  await act(() => {
    const held = { alt: false, control: false, shift }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** Each event a handler heard, by its name and what it carried. */
const heard = () => {
  const events: string[] = []
  const take =
    (name: string) =>
    (event: {
      detail: { index?: number; label?: string; pointerType?: string; value?: string }
    }) => {
      const { index, label, pointerType, value } = event.detail
      events.push(
        value === undefined
          ? `${name} ${index ?? ''} ${pointerType ?? ''} ${label ?? ''}`.trim()
          : `${name} ${value}`,
      )
    }
  return {
    events,
    props: {
      onBeforeChange: take('before-change'),
      onChange: () => events.push('change'),
      onReadingChange: take('reading'),
      onReadingPress: take('press'),
    },
  }
}

/* A cell is 12 points with a gap of 4, at the default text size. */
describe('the cells', () => {
  test('stands a cell for each row down each column and then across, in its tone', async () => {
    await render(<Chart rows={7} thresholds="1 3" tones="1 5" />)
    const drawn = cells()
    expect(drawn).toHaveLength(14)
    expect([drawn[1]?.left, drawn[1]?.top]).toEqual([0, 16])
    expect([drawn[8]?.left, drawn[8]?.top]).toEqual([16, 16])
    /* A day with nothing in it takes the quiet ground, and its own tone wins over the buckets. */
    expect(drawn[0]?.backgroundColor).not.toBe(drawn[1]?.backgroundColor)
    expect(drawn[10]?.backgroundColor).not.toBe(drawn[3]?.backgroundColor)
  })

  test('draws the newest whole columns that fit a narrow strip', async () => {
    await render(<Chart rows={7} />)
    /* Room for one column of 12 and its gap, less than two. */
    await hostWide(20)
    expect(cells()).toHaveLength(7)
  })

  test('tells resize as the cells it draws change, from the width it first measured', async () => {
    const sizes: number[] = []
    await render(
      <Chart
        onResize={(event: { detail: { size: number } }) => sizes.push(event.detail.size)}
        rows={7}
      />,
    )
    await hostWide(20)
    await hostWide(40)
    expect(sizes).toEqual([14])
  })

  test('says it has no readings, in place of the cells, and draws a footer only for its slots', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(cells()).toHaveLength(0)
    await render(<Chart start={<Text>Jun</Text>} />)
    expect(screen.getByText('Jun')).toBeTruthy()
  })
})

describe('the reading', () => {
  test('a tap shows the cell under it and presses it, and leaves the cells drawn', async () => {
    const { events, props } = heard()
    await render(<Chart rows={7} {...props} />)
    await layOut(28, 108)
    const before = cells()
    /* The second column, the third day down: the tenth row. */
    await tapAt(20, 36)
    expect(events).toEqual(['press 9 touch 10 Jun', 'reading 9 touch 10 Jun'])
    /* Every cell is the one drawn before, and the one tapped is drawn again over them. */
    expect(cells().slice(0, 14)).toEqual(before)
    expect(cells()).toHaveLength(15)
    expect(strip().props.accessibilityValue).toEqual({ text: '10 Jun: Commits 4 (10 of 14)' })
  })

  test('the keys move a day down, a week across, and a month by the dates', async () => {
    const { events, props } = heard()
    await render(<Chart rows={7} {...props} />)
    await key('ArrowDown')
    await key('ArrowRight')
    await key('ArrowDown')
    await key('PageUp')
    await key('End')
    expect(events).toEqual([
      'reading 0 keyboard 1 Jun',
      'reading 7 keyboard 8 Jun',
      'reading 8 keyboard 9 Jun',
      'reading 0 keyboard 1 Jun',
      'reading 13 keyboard 14 Jun',
    ])
  })
})

describe('the selection', () => {
  test('a press selects the cell, asking first, and a refusal keeps the selection', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const { events, props } = heard()
    let refuse = false
    await render(
      <Chart
        {...props}
        onBeforeChange={(event: { detail: { value: string }; preventDefault: () => void }) => {
          props.onBeforeChange(event)
          if (refuse) {
            event.preventDefault()
          }
        }}
        selectionMode="single"
      />,
    )
    await key('ArrowRight')
    await key('Enter')
    expect(events.slice(1)).toEqual([
      'press 0 keyboard 1 Jun',
      'before-change 2026-06-01',
      'change',
    ])
    expect(said.said.at(-1)?.message).toBe('1 selected')
    refuse = true
    await key('ArrowRight')
    await key('Enter')
    expect(events.at(-1)).toBe('before-change 2026-06-02')
  })

  test('Shift with an arrow takes in the days from the last one pressed, under multiple', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} rows={7} selectionMode="multiple" selectionShape="rectangle" />)
    await key('ArrowDown')
    await key(' ')
    await key('ArrowRight', true)
    await key('ArrowDown', true)
    expect(events.filter((one) => one.startsWith('before-change')).at(-1)).toBe(
      'before-change 2026-06-01, 2026-06-02, 2026-06-08, 2026-06-09',
    )
  })
})
