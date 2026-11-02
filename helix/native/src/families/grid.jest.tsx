/*
 * The generated Grid, drawn from its real intermediate form with the native
 * grid: a view that measures its width, then lays its cells out in rows on
 * the tracks `columns`, `min`, or a count past six asks for, with its gaps,
 * its spans, and its alignment. Each spec lays the grid out at a width it
 * gives it, as the phone's layout would, and reads each cell's frame.
 * `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { type ReactNode, useEffect } from 'react'
import { Dimensions, Text } from 'react-native'
import { SPACE_SCALE_LIMIT } from '../theme/drawn'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixCard } from './card/index.native'
import { type Drawn, styleOf } from './drawn'
import { HelixGrid } from './grid/index.native'
import { HelixText } from './text/index.native'

const scaled = (fontScale: number) => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

beforeEach(() => {
  scaled(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

/** The theme's tokens, handed out of the tree. */
let tokens: Readonly<Record<string, number | string>> = {}
const Tokens = () => {
  tokens = useTokens()
  return null
}

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Tokens />
  </HelixTheme>
)

/** The grid's own view: the first drawn. */
const hostOf = (json: unknown): Drawn => (Array.isArray(json) ? json[0] : json) as Drawn

/** What a drawn node holds that is a node. */
const inside = (node: Drawn | undefined): Drawn[] =>
  (node?.children ?? []).filter((child): child is Drawn => typeof child !== 'string')

/** The words `words` are drawn in. */
const cellText = (words: string) => <Text key={words}>{words}</Text>

/** A drawn element, as the specs walk up from one. */
interface Instance {
  readonly parent: Instance | null
  readonly props: Readonly<Record<string, unknown>>
}

/**
 * Lays the grid that draws `words` out at `width`, as the phone's layout
 * tells the view the grid measures itself with: the outermost view around
 * the words that hears its layout, since a card in a cell hears its own.
 */
const laidOut = async (words: string, width: number) => {
  let at: Instance | null = screen.getByText(words) as unknown as Instance
  let grid: Instance | null = null
  while (at !== null) {
    grid = typeof at.props.onLayout === 'function' ? at : grid
    at = at.parent
  }
  await act(() =>
    fireEvent(grid as never, 'layout', { nativeEvent: { layout: { height: 400, width } } }),
  )
}

/** A length to a tenth of a point, as the frames are read: a cell is drawn a hair inside its columns. */
const r = (points: number) => Math.round(points * 10) / 10

/** The line of cells the grid draws, in the view it measures. */
const lineOf = (json: unknown): Drawn => inside(hostOf(json))[0] as Drawn

/**
 * Each cell's frame as `row x width` and the words it holds, read off the
 * drawn line: a cell's offset is its start margin from the cell before it,
 * and the last of a row takes the rest of the line with its end margin.
 */
const frames = (json: unknown): string[] => {
  let row = 0
  let end = 0
  return inside(lineOf(json)).map((cell) => {
    const style = styleOf(cell)
    const x = end + Number(style.marginStart ?? 0)
    const width = Number(style.width)
    const words = JSON.stringify(cell).match(/"children":\["([^"]+)"\]/)?.[1] ?? ''
    const frame = `${row} ${r(x)} ${r(width)} ${words}`
    end = x + width
    if (style.marginEnd !== undefined) {
      row += 1
      end = 0
    }
    return frame
  })
}

const Counted = ({
  children,
  mounted,
}: {
  readonly children: string
  readonly mounted: () => void
}) => {
  useEffect(() => {
    mounted()
  }, [mounted])
  return <Text>{children}</Text>
}

describe('the generated Grid', () => {
  test('is a column with no role, and its cells one to a line until it is measured', async () => {
    const view = await render(
      themed(<HelixGrid columns={3}>{['A', 'B', 'C'].map(cellText)}</HelixGrid>),
    )
    const host = hostOf(view.toJSON())
    expect(styleOf(host)).toMatchObject({ display: 'flex', flexDirection: 'column' })
    expect(styleOf(host).columnGap).toBeUndefined()
    expect(host.props.role).toBeUndefined()
    expect(host.props.accessibilityRole).toBeUndefined()
    expect(inside(lineOf(view.toJSON())).map((cell) => styleOf(cell).width)).toEqual([
      '100%',
      '100%',
      '100%',
    ])
    expect(screen.getByText('B')).toBeTruthy()
  })

  test('lays equal columns out at its measured width, with the gaps between them', async () => {
    const view = await render(
      themed(
        <HelixGrid columnGap="md" columns={3} rowGap="sm">
          {['A', 'B', 'C', 'D', 'E'].map(cellText)}
        </HelixGrid>,
      ),
    )
    await laidOut('A', 320)
    const gap = Number(tokens['space-md'])
    const width = (320 - 2 * gap) / 3
    const at = (column: number) => r(column * (width + gap))
    const wide = r(width)
    expect(frames(view.toJSON())).toEqual([
      `0 0 ${wide} A`,
      `0 ${at(1)} ${wide} B`,
      `0 ${at(2)} ${wide} C`,
      `1 0 ${wide} D`,
      `1 ${at(1)} ${wide} E`,
    ])
    expect(styleOf(lineOf(view.toJSON()))).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: tokens['space-sm'],
    })
  })

  test('fits as many columns of `min` as its width holds, and reflows when it changes', async () => {
    const view = await render(
      themed(
        <HelixGrid gap="md" min="10rem">
          {['A', 'B', 'C'].map(cellText)}
        </HelixGrid>,
      ),
    )
    const gap = Number(tokens['space-md'])
    await laidOut('A', 400)
    const half = (400 - gap) / 2
    expect(frames(view.toJSON())).toEqual([
      `0 0 ${r(half)} A`,
      `0 ${r(half + gap)} ${r(half)} B`,
      `1 0 ${r(half)} C`,
    ])
    await laidOut('A', 300)
    expect(frames(view.toJSON())).toEqual(['0 0 300 A', '1 0 300 B', '2 0 300 C'])
    await laidOut('A', 1000)
    const third = (1000 - 2 * gap) / 3
    expect(frames(view.toJSON())[2]).toBe(`0 ${r(2 * (third + gap))} ${r(third)} C`)
  })

  test('derives a count past six, which the web writes into its own rule', async () => {
    const view = await render(
      themed(
        <HelixGrid columns={8}>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(cellText)}
        </HelixGrid>,
      ),
    )
    await laidOut('A', 800)
    expect(frames(view.toJSON())).toEqual([
      '0 0 100 A',
      '0 100 100 B',
      '0 200 100 C',
      '0 300 100 D',
      '0 400 100 E',
      '0 500 100 F',
      '0 600 100 G',
      '0 700 100 H',
      '1 0 100 I',
    ])
  })

  test('spans the columns `data-grid-span` asks for, and runs `full` from the first to the last', async () => {
    const view = await render(
      themed(
        <HelixGrid columns={3}>
          <Text data-grid-span="full">Reports</Text>
          <Text data-grid-span="2">Revenue</Text>
          <Text>Refunds</Text>
          <Text>Orders</Text>
          <Text data-grid-span="2">Invoices</Text>
          <Text data-grid-span={2}>Customers</Text>
        </HelixGrid>,
      ),
    )
    await laidOut('Reports', 300)
    expect(frames(view.toJSON())).toEqual([
      '0 0 300 Reports',
      '1 0 200 Revenue',
      '1 200 100 Refunds',
      '2 0 100 Orders',
      '2 100 200 Invoices',
      '3 0 200 Customers',
    ])
  })

  test('draws by `columns` where `min` is no length a stylesheet could hold', async () => {
    const view = await render(
      themed(
        <HelixGrid columns={2} min="1px,1fr)} :host{background:red} @media all{">
          {['A', 'B', 'C'].map(cellText)}
        </HelixGrid>,
      ),
    )
    await laidOut('A', 200)
    expect(frames(view.toJSON())).toEqual(['0 0 100 A', '0 100 100 B', '1 0 100 C'])
  })

  test('stretches each cell across its column and down its row, a Helix component in it too', async () => {
    const view = await render(
      themed(
        <HelixGrid columns={2}>
          <HelixCard>One</HelixCard>
          <HelixCard>Two</HelixCard>
        </HelixGrid>,
      ),
    )
    await laidOut('One', 200)
    const line = lineOf(view.toJSON())
    expect(styleOf(line)).toMatchObject({ alignItems: 'stretch', flexDirection: 'row' })
    const [cell] = inside(line)
    expect(styleOf(cell as Drawn)).toMatchObject({ alignItems: 'stretch', width: 99.99 })
    expect(styleOf(inside(cell)[0] as Drawn)).toMatchObject({ flexGrow: 1 })
  })

  test('aligns each cell in its row and in its column as `align-items` and `justify-items` say', async () => {
    const view = await render(
      themed(
        <HelixGrid alignItems="center" columns={2} justifyItems="end">
          <HelixCard>One</HelixCard>
          <HelixCard>Two</HelixCard>
        </HelixGrid>,
      ),
    )
    await laidOut('One', 200)
    const line = lineOf(view.toJSON())
    expect(styleOf(line)).toMatchObject({ alignItems: 'center' })
    const [cell] = inside(line)
    expect(styleOf(cell as Drawn)).toMatchObject({ alignItems: 'flex-end' })
    expect(styleOf(inside(cell)[0] as Drawn).flexGrow).toBeUndefined()
  })

  test('keeps each cell drawn where it was as it reflows, so what it holds keeps its state', async () => {
    let mounts = 0
    const mounted = () => {
      mounts += 1
    }
    await render(
      themed(
        <HelixGrid min="10rem">
          {['A', 'B', 'C'].map((words) => (
            <Counted key={words} mounted={mounted}>
              {words}
            </Counted>
          ))}
        </HelixGrid>,
      ),
    )
    await laidOut('A', 600)
    await laidOut('A', 200)
    await laidOut('A', 600)
    expect(mounts).toBe(3)
  })

  test('keeps the role and the words of what it lays out', async () => {
    await render(
      themed(
        <HelixGrid columns={2}>
          <HelixText as="h3">Reports</HelixText>
          <HelixText>Revenue</HelixText>
        </HelixGrid>,
      ),
    )
    await laidOut('Reports', 200)
    expect(screen.getByRole('header', { name: 'Reports' })).toBeTruthy()
    expect(screen.getByText('Revenue')).toBeTruthy()
  })

  test('grows its columns of `min` with the reader text size, and stops its gaps', async () => {
    scaled(2)
    const view = await render(
      themed(
        <HelixGrid gap="md" min="10rem">
          {['A', 'B'].map(cellText)}
        </HelixGrid>,
      ),
    )
    expect(Number(tokens['space-md'])).toBeCloseTo(16 * SPACE_SCALE_LIMIT, 1)
    /* At twice the text size, 10rem is 320 points, and two of them do not fit in 400. */
    await laidOut('A', 400)
    expect(frames(view.toJSON())).toEqual(['0 0 400 A', '1 0 400 B'])
  })
})
