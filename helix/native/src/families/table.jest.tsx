import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { HelixRoot } from '../index'
import { pinShift } from '../machines/table'
import { travelTo } from '../machines/table-moves'
import { trackWidths } from '../machines/table-tracks'
import { HelixTable, HelixTableCell, HelixTableColumn, HelixTableRow } from './table/index.native'

const BASIS = { em: 14, rem: 16 }

describe('a table on a phone', () => {
  test('tracks: a length, a share, and the widest cell', () => {
    expect(trackWidths(['10rem', '1fr', 'max-content'], [0, 0, 40], 390, BASIS)).toEqual([
      160, 190, 40,
    ])
  })

  test('tracks: a share keeps its least, and the table may overflow', () => {
    expect(
      trackWidths(['minmax(max-content, 1fr)', 'minmax(max-content, 1fr)'], [300, 200], 390, BASIS),
    ).toEqual([300, 200])
    expect(trackWidths(['minmax(14ch, 2fr)', '100px'], [], 110, BASIS)).toEqual([98, 100])
  })

  test('a cell says its heading with its words', async () => {
    await render(
      <HelixRoot>
        <HelixTable label="Services">
          <HelixTableColumn>Region</HelixTableColumn>
          <HelixTableRow>
            <HelixTableCell>us-east-1</HelixTableCell>
          </HelixTableRow>
        </HelixTable>
      </HelixRoot>,
    )
    expect(screen.getByLabelText('Region: us-east-1')).toBeTruthy()
  })

  test('a pinned column stands still past the columns before it, on either edge', () => {
    expect(pinShift(0, 40, 200, false)).toBe(0)
    expect(pinShift(30, 40, 200, false)).toBe(0)
    expect(pinShift(100, 40, 200, false)).toBe(60)
    expect(pinShift(200, 40, 200, true)).toBe(0)
    expect(pinShift(100, 40, 200, true)).toBe(-60)
  })

  test("a dragged row passes a row at that row's middle", () => {
    const order = ['a', 'b', 'c']
    const heights = new Map([
      ['b', 40],
      ['c', 80],
    ])
    expect(travelTo(order, heights, 0, 19)).toBe(0)
    expect(travelTo(order, heights, 0, 20)).toBe(1)
    expect(travelTo(order, heights, 0, 79)).toBe(1)
    expect(travelTo(order, heights, 0, 80)).toBe(2)
    expect(travelTo(order, heights, 0, 900)).toBe(2)
    expect(travelTo(order, heights, 2, -30)).toBe(1)
  })

  test("a cell draws its column's edge, and the inset after its words", async () => {
    await render(
      <HelixRoot>
        <HelixTable label="Services">
          <HelixTableColumn textAlign="end">Region</HelixTableColumn>
          <HelixTableRow value="a">
            <HelixTableCell>us-east-1</HelixTableCell>
          </HelixTableRow>
        </HelixTable>
      </HelixRoot>,
    )
    const cell = StyleSheet.flatten(screen.getByLabelText('Region: us-east-1').props.style)
    const first = screen.getByLabelText('Region: us-east-1').children[0] as unknown as {
      props: { style: object }
    }
    const inner = StyleSheet.flatten(first.props.style) as unknown as {
      justifyContent: string
      paddingEnd: number
    }
    expect(cell.flexDirection).toBe('row')
    expect(inner.justifyContent).toBe('flex-end')
    expect(inner.paddingEnd).toBeGreaterThan(0)
  })

  test("a row's controls read the words the table is given", async () => {
    await render(
      <HelixRoot>
        <HelixTable label="Services" selectable selectRowLabel="Pick {row}">
          <HelixTableColumn>Region</HelixTableColumn>
          <HelixTableRow value="a">
            <HelixTableCell>us-east-1</HelixTableCell>
          </HelixTableRow>
        </HelixTable>
      </HelixRoot>,
    )
    expect(screen.getByLabelText('Pick us-east-1')).toBeTruthy()
  })
})
