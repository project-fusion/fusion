import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { Text } from 'react-native'
import { HelixRoot } from '../index'
import type { WindowHandle } from '../machines/window'
import { HelixVirtualList } from './virtual-list/index.native'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date']
const LONG = Array.from({ length: 500 }, (_, at) => `Row ${at + 1}`)

/** The list's scroll view. */
const scroller = () => {
  const found = screen.root?.queryAll(
    (node) => typeof node.props.onMomentumScrollEnd === 'function',
  )
  if (found?.[0] === undefined) {
    throw new Error('the list draws no scroll view')
  }
  return found[0]
}

/** Scrolls the list to `y`, in a frame of 320 by content of `content`. */
const scrollTo = (y: number, content: number) =>
  fireEvent.scroll(scroller(), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { height: content, width: 320 },
      layoutMeasurement: { height: 320, width: 320 },
    },
  })

describe('Virtual List on a phone', () => {
  test('an item with no renderItem is its words, and renderItem draws one as it says', async () => {
    await render(
      <HelixRoot>
        <HelixVirtualList items={FRUIT} label="Fruit" />
      </HelixRoot>,
    )
    expect(screen.getByText('Banana')).toBeTruthy()
    await render(
      <HelixRoot>
        <HelixVirtualList
          items={FRUIT}
          label="Fruit"
          renderItem={(item: string, index: number) => <Text>{`${index}: ${item}`}</Text>}
        />
      </HelixRoot>,
    )
    expect(screen.getByText('1: Banana')).toBeTruthy()
  })

  test('draws the rows near the screen, and no more than a few of a long set', async () => {
    await render(
      <HelixRoot>
        <HelixVirtualList items={LONG} label="Rows" />
      </HelixRoot>,
    )
    expect(screen.getByText('Row 1')).toBeTruthy()
    expect(screen.queryByText('Row 500')).toBeNull()
  })

  test('says which items are on screen as the list moves, and asks for more within a screen of the end', async () => {
    const ranges: { first: number; last: number }[] = []
    let asked = 0
    await render(
      <HelixRoot>
        <HelixVirtualList
          items={LONG}
          label="Rows"
          onLoadMore={() => {
            asked += 1
          }}
          onRangeChange={(event: { detail: { first: number; last: number } }) => {
            ranges.push(event.detail)
          }}
        />
      </HelixRoot>,
    )
    const content = LONG.length * 32
    await scrollTo(3200, content)
    expect(ranges.at(-1)).toEqual({ first: 100, last: 110 })
    expect(asked).toBe(0)
    await scrollTo(content - 500, content)
    expect(asked).toBe(1)
    await scrollTo(content - 320, content)
    expect(asked).toBe(1)
  })

  test('loading draws its words after the rows, and an empty list draws its own', async () => {
    await render(
      <HelixRoot>
        <HelixVirtualList items={FRUIT} label="Fruit" loading />
      </HelixRoot>,
    )
    expect(screen.getByText('Loading more')).toBeTruthy()
    await render(
      <HelixRoot>
        <HelixVirtualList emptyText="No fruit" items={[]} label="Fruit" />
      </HelixRoot>,
    )
    expect(screen.getByText('No fruit')).toBeTruthy()
    await render(
      <HelixRoot>
        <HelixVirtualList items={[]} label="Fruit" />
      </HelixRoot>,
    )
    expect(screen.queryByText('No fruit')).toBeNull()
  })

  test('draws a header before each section, by its renderSection', async () => {
    await render(
      <HelixRoot>
        <HelixVirtualList
          items={[
            { kind: 'Fruit', name: 'Apple' },
            { kind: 'Root', name: 'Carrot' },
          ]}
          label="Food"
          renderSection={(name: string, index: number) => <Text>{`${index} ${name}`}</Text>}
          sectionField="kind"
          textField="name"
        />
      </HelixRoot>,
    )
    expect(screen.getByText('0 Fruit')).toBeTruthy()
    expect(screen.getByText('1 Root')).toBeTruthy()
    expect(screen.getByText('Carrot')).toBeTruthy()
  })

  test('a chosen row says so to a screen reader', async () => {
    await render(
      <HelixRoot>
        <HelixVirtualList items={FRUIT} label="Fruit" selectionMode="multiple" value="Banana" />
      </HelixRoot>,
    )
    expect(
      screen.getByRole('button', { includeHiddenElements: true, name: 'Banana', selected: true }),
    ).toBeTruthy()
  })

  test('its ref scrolls to an item and reads the range', async () => {
    const ref = createRef<WindowHandle>()
    await render(
      <HelixRoot>
        <HelixVirtualList items={LONG} label="Rows" ref={ref} />
      </HelixRoot>,
    )
    await act(async () => {
      ref.current?.scrollToIndex(40, { align: 'start' })
    })
    expect(ref.current?.range()).toEqual({ first: 0, last: 0 })
  })
})
