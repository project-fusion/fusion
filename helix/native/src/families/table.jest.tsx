import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { FlatList, StyleSheet } from 'react-native'
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

  test('a row dragged near the edge of a windowed table scrolls it, and the scroll carries its place', async () => {
    const before = measure()
    setMeasure({ ...before, box: () => ({ height: 400, width: 300, x: 0, y: 100 }) })
    const scrollTo = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {})
    const rows = ['a', 'b', 'c', 'd', 'e', 'f']
    await render(
      <HelixRoot>
        <HelixTable label="Rows" reorderable windowed>
          <HelixTableColumn>Name</HelixTableColumn>
          {rows.map((row) => (
            <HelixTableRow key={row} value={row}>
              <HelixTableCell>{row}</HelixTableCell>
            </HelixTableRow>
          ))}
        </HelixTable>
      </HelixRoot>,
    )
    const button = screen.getByTestId('table:a:grip-button')
    let grip = button.parent
    while (grip !== null && grip.props.onResponderMove === undefined) {
      grip = grip.parent
    }
    const at = (pageY: number) => ({ nativeEvent: { pageY } })
    if (grip === null) {
      throw new Error('The grip hears no drag.')
    }
    await fireEvent(grip, 'touchStart', at(300))
    await fireEvent(grip, 'responderGrant', at(300))
    await fireEvent(grip, 'responderMove', at(310))
    expect(scrollTo).not.toHaveBeenCalled()
    await fireEvent(grip, 'responderMove', at(480))
    expect(scrollTo).toHaveBeenLastCalledWith({ animated: false, offset: 16 })
    await fireEvent(grip, 'responderTerminate', at(480))
    scrollTo.mockRestore()
    setMeasure(before)
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
