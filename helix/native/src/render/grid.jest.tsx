/*
 * The native grid's drawing, on track lists Grid's own props do not reach:
 * a column sized by its content, measured from its cell, and a row whose
 * height a length sets. Each spec lays the grid out at a width it gives it,
 * as the phone's layout would, and reads each cell's frame.
 */
import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { type Drawn, styleOf } from '../families/drawn'
import type { GridForm } from '../style/resolved'
import { GridCell, GridContent } from './grid'

const basis = { em: 16, rem: 16 }

/** A grid of `form` holding a cell for each of `words`. */
const drawn = (form: GridForm, words: readonly string[]) =>
  render(
    <GridContent basis={basis} form={form}>
      {words.map((one) => (
        <GridCell key={one}>
          <Text>{one}</Text>
        </GridCell>
      ))}
    </GridContent>,
  )

/** A drawn element, as the specs walk up from one. */
interface Instance {
  readonly parent: Instance | null
  readonly props: Readonly<Record<string, unknown>>
}

/** The nearest view around `words` that hears its layout, laid out `width` wide. */
const laidOut = async (words: string, width: number) => {
  let at: Instance | null = screen.getByText(words) as unknown as Instance
  while (at !== null && typeof at.props.onLayout !== 'function') {
    at = at.parent
  }
  await act(() =>
    fireEvent(at as never, 'layout', { nativeEvent: { layout: { height: 40, width } } }),
  )
}

/** Each cell's drawn style, in order. */
const cellsOf = (json: unknown): Readonly<Record<string, unknown>>[] =>
  ((json as Drawn).children ?? [])
    .filter((child): child is Drawn => typeof child !== 'string')
    .map((cell) => styleOf(cell))

describe('the native grid', () => {
  test('draws a cell in a column sized by its content at its own width, then sizes the column to it', async () => {
    const view = await drawn({ columnGap: 10, columns: 'auto 1fr', rowGap: 0 }, ['Label', 'Value'])
    /* The grid first, which is the only view that hears its layout until it has its width. */
    await laidOut('Label', 300)
    const [label] = cellsOf(view.toJSON())
    expect(label?.width).toBeUndefined()
    await laidOut('Label', 80)
    const [measured, value] = cellsOf(view.toJSON())
    expect(measured?.width).toBeCloseTo(80, 1)
    expect(value).toMatchObject({ marginStart: expect.any(Number) })
    expect(Number(value?.width)).toBeCloseTo(300 - 80 - 10, 1)
    expect(Number(value?.marginStart) + Number(measured?.width)).toBeCloseTo(90, 1)
  })

  test('gives a row the height a length sets, and leaves the rest to their cells', async () => {
    const view = await drawn({ columnGap: 0, columns: '1fr 1fr', rowGap: 4, rows: '3rem auto' }, [
      'A',
      'B',
      'C',
    ])
    await laidOut('A', 200)
    const [a, b, c] = cellsOf(view.toJSON())
    expect(a).toMatchObject({ height: 48 })
    expect(b).toMatchObject({ height: 48 })
    expect(c?.height).toBeUndefined()
  })

  test('gives each cell of a row the least height `minmax()` sets, so the line is at least that tall', async () => {
    const view = await drawn(
      {
        columnGap: 0,
        columns: 'minmax(0, 1fr)',
        rowGap: 0,
        rows: 'repeat(2, minmax(30rem, auto))',
      },
      ['A', 'B', 'C'],
    )
    await laidOut('A', 200)
    const [a, b, c] = cellsOf(view.toJSON())
    expect(a).toMatchObject({ minHeight: 480 })
    expect(a?.height).toBeUndefined()
    expect(b).toMatchObject({ minHeight: 480 })
    expect(c?.minHeight).toBeUndefined()
  })

  test('ends each row with the rest of the line, so the next row starts a line of its own', async () => {
    const view = await drawn({ columnGap: 0, columns: 'repeat(3, 1fr)', rowGap: 0 }, ['A', 'B'])
    await laidOut('A', 300)
    const [a, b] = cellsOf(view.toJSON())
    expect(a?.marginEnd).toBeUndefined()
    expect(Number(b?.marginEnd)).toBeCloseTo(100, 1)
  })
})
