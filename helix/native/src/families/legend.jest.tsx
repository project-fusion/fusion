/*
 * The generated Legend, drawn from its real intermediate form: an entry for
 * each series of a table read by its id, each swatch in its palette color,
 * the rows under `categories`, and under `toggles` a press that hides a
 * series on the table, asking first, which a chart reading the same table
 * reads. `test:native` writes the component beside this file.
 */
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions } from 'react-native'
import { hideChartSeries, publishChartSource, useHiddenSeries } from '../render/chart-sources'
import { HelixTheme } from '../theme/helix-theme'
import { HelixLegend, type HelixLegendProps } from './legend/index.native'

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  hideChartSeries('revenue', [])
})

/** A table of three series over two quarters, published under the id `revenue`. */
const Table = () => {
  useEffect(
    () =>
      publishChartSource('revenue', {
        caption: 'Revenue by quarter',
        rows: [
          {
            cells: [
              { name: 'Booked', text: '420', value: 420 },
              { name: 'Renewals', text: '310', value: 310 },
              { name: 'Forecast', text: '180', value: 180 },
            ],
            label: 'Q1',
          },
          {
            cells: [
              { name: 'Booked', text: '488', value: 488 },
              { name: 'Renewals', text: '352', value: 352 },
              { name: 'Forecast', text: '240', value: 240 },
            ],
            label: 'Q2',
          },
        ],
      }),
    [],
  )
  return null
}

/** What the table hides, as a chart reading it sees it. */
let seen: readonly string[] = []
const Reader = () => {
  seen = [...useHiddenSeries('revenue')]
  return null
}

const Legend = (props: HelixLegendProps) => (
  <HelixTheme mode="light">
    <Table />
    <Reader />
    <HelixLegend for="revenue" {...props} />
  </HelixTheme>
)

/** The presses the toggles draw, in order. */
const toggles = () =>
  screen.root?.queryAll((node) => node.props.accessibilityRole === 'togglebutton') ?? []

describe('the entries', () => {
  test('an entry for each column of numbers, named by its heading, in a list named by the caption', async () => {
    await render(<Legend />)
    for (const name of ['Booked', 'Renewals', 'Forecast']) {
      expect(screen.getByText(name)).toBeTruthy()
    }
    const list = screen.root?.queryAll((node) => node.props.accessibilityRole === 'list')[0]
    expect(list?.props.accessibilityLabel).toBe('Revenue by quarter')
  })

  test('an entry for each row under categories', async () => {
    await render(<Legend entries="categories" />)
    expect(screen.getByText('Q1')).toBeTruthy()
    expect(screen.getByText('Q2')).toBeTruthy()
  })

  test('each column but the first under measures', async () => {
    await render(<Legend entries="measures" />)
    expect(screen.queryByText('Booked')).toBeNull()
    expect(screen.getByText('Forecast')).toBeTruthy()
  })
})

describe('the toggles', () => {
  test('a press hides its series on the table, and a second shows it again', async () => {
    const heard: string[] = []
    await render(
      <Legend
        onBeforeChange={(event: { detail: { value: string } }) => heard.push(event.detail.value)}
        onChange={() => heard.push('change')}
        toggles
      />,
    )
    expect(toggles()).toHaveLength(3)
    await act(async () => {
      fireEvent.press(toggles()[1] as never)
    })
    expect(seen).toEqual(['renewals'])
    await act(async () => {
      fireEvent.press(toggles()[1] as never)
    })
    expect(seen).toEqual([])
    expect(heard).toEqual(['Renewals', 'change', '', 'change'])
  })

  test('a refused change hides nothing', async () => {
    await render(
      <Legend
        onBeforeChange={(event: { preventDefault: () => void }) => event.preventDefault()}
        toggles
      />,
    )
    await act(async () => {
      fireEvent.press(toggles()[0] as never)
    })
    expect(seen).toEqual([])
  })

  test('hidden-series starts with series hidden on the table', async () => {
    await render(<Legend hiddenSeries="Forecast" toggles />)
    expect(seen).toEqual(['forecast'])
  })
})
