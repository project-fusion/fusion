/*
 * The generated Data Table, drawn from its real intermediate form: rows from an
 * array, sorted and searched by core's arithmetic, a page of them, selection past
 * the page, rows that hold rows, a load-more row, and a column's menu.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixDataTable } from './data-table/index.native'
import './menu/index.native'
import { HelixTableColumn } from './table/index.native'

const draw = (content: ReactNode) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider mode="light" rem={16} tokens={light}>
        {content}
      </ThemeProvider>
    </GestureHandlerRootView>,
  )

const files = [
  { id: 'a', name: 'archive', size: 900 },
  { id: 'b', name: 'backup', size: 20 },
  { id: 'c', name: 'config', size: 300 },
  { id: 'd', name: 'data', size: 4 },
  { id: 'e', name: 'export', size: 55 },
]

const columns = [
  <HelixTableColumn field="name" key="name" sortable>
    Name
  </HelixTableColumn>,
  <HelixTableColumn
    cell={(row: Readonly<Record<string, unknown>>) => `${row.size as number} B`}
    compare={(row: Readonly<Record<string, unknown>>) => row.size}
    field="size"
    key="size"
    sortable
  >
    Size
  </HelixTableColumn>,
]

const shown = (words: readonly string[]) => words.filter((one) => screen.queryByText(one) !== null)

const NAMES = files.map((file) => file.name)

const press = (name: string) =>
  act(async () => {
    fireEvent.press(screen.getByLabelText(name))
  })

describe('a table drawn from an array', () => {
  test('a cell draws what its column reads of the row, and the field where it reads nothing', async () => {
    await draw(
      <HelixDataTable label="Files" rowKey="id" rows={files}>
        {columns}
      </HelixDataTable>,
    )
    expect(shown(NAMES)).toEqual(NAMES)
    expect(screen.queryByText('900 B')).not.toBeNull()
  })

  test("a sort reads the column's `compare`, where the words would order otherwise", async () => {
    await draw(
      <HelixDataTable defaultSort="size:asc" label="Files" rowKey="id" rows={files}>
        {columns}
      </HelixDataTable>,
    )
    const order = screen.getAllByText(/ B$/).map((node) => node.props.children)
    expect(order).toEqual(['4 B', '20 B', '55 B', '300 B', '900 B'])
  })

  test('`filter` leaves the rows a column finds, and `empty-text` shows when none is left', async () => {
    const view = await draw(
      <HelixDataTable filter="config" label="Files" rowKey="id" rows={files}>
        {columns}
      </HelixDataTable>,
    )
    expect(shown(NAMES)).toEqual(['config'])
    await view.rerender(
      <GestureHandlerRootView>
        <ThemeProvider mode="light" rem={16} tokens={light}>
          <HelixDataTable
            emptyText="Nothing here"
            filter="zzz"
            label="Files"
            rowKey="id"
            rows={files}
          >
            {columns}
          </HelixDataTable>
        </ThemeProvider>
      </GestureHandlerRootView>,
    )
    expect(shown(NAMES)).toEqual([])
    expect(screen.queryByText('Nothing here')).not.toBeNull()
  })

  test('a page holds its size of rows, and the pagination moves through the result', async () => {
    const navigate = jest.fn()
    await draw(
      <HelixDataTable
        defaultPageSize={2}
        label="Files"
        onNavigate={navigate}
        rowKey="id"
        rows={files}
      >
        {columns}
      </HelixDataTable>,
    )
    expect(shown(NAMES)).toEqual(['archive', 'backup'])
    await press('Next page')
    expect(shown(NAMES)).toEqual(['config', 'data'])
    expect(navigate).toHaveBeenCalledTimes(1)
    await press('Next page')
    expect(shown(NAMES)).toEqual(['export'])
  })

  test('a refused page stays', async () => {
    await draw(
      <HelixDataTable
        defaultPageSize={2}
        label="Files"
        onBeforeNavigate={(event: { preventDefault: () => void }) => event.preventDefault()}
        rowKey="id"
        rows={files}
      >
        {columns}
      </HelixDataTable>,
    )
    await press('Next page')
    expect(shown(NAMES)).toEqual(['archive', 'backup'])
  })

  test('the heading checkbox selects every row of the result, past the page', async () => {
    const select = jest.fn()
    await draw(
      <HelixDataTable
        defaultPageSize={2}
        label="Files"
        onSelect={select}
        rowKey="id"
        rows={files}
        selectable
      >
        {columns}
      </HelixDataTable>,
    )
    await press('Select every row')
    const [event] = select.mock.calls[0] as [{ detail: { value: string } }]
    expect(event.detail.value).toBe('a,b,c,d,e')
  })

  test('rows that hold rows open and close', async () => {
    const tree = [
      { id: 'src', name: 'src', rows: [{ id: 'lib', name: 'lib' }] },
      { id: 'doc', name: 'doc' },
    ]
    await draw(
      <HelixDataTable childField="rows" label="Files" rowKey="id" rows={tree}>
        <HelixTableColumn field="name">Name</HelixTableColumn>
      </HelixDataTable>,
    )
    expect(shown(['src', 'lib', 'doc'])).toEqual(['src', 'doc'])
    await press('Expand src')
    expect(shown(['src', 'lib', 'doc'])).toEqual(['src', 'lib', 'doc'])
  })

  test('the row after the last asks for more', async () => {
    const more = jest.fn()
    await draw(
      <HelixDataTable label="Files" loadMore onLoadMore={more} rowKey="id" rows={files}>
        {columns}
      </HelixDataTable>,
    )
    await act(async () => {
      fireEvent.press(screen.getByText('Load more'))
    })
    expect(more).toHaveBeenCalledTimes(1)
  })

  test('a column menu sorts and hides its column', async () => {
    const toggled = jest.fn()
    await draw(
      <HelixDataTable label="Files" onColumnToggle={toggled} rowKey="id" rows={files}>
        <HelixTableColumn field="name" menu sortable>
          Name
        </HelixTableColumn>
        <HelixTableColumn field="size" menu>
          Size
        </HelixTableColumn>
      </HelixDataTable>,
    )
    await press('Size column menu')
    await act(async () => {
      fireEvent.press(screen.getByText('Hide column'))
    })
    expect(toggled).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Size')).toBeNull()
  })

  test('a column menu sorts its column the way a row says', async () => {
    await draw(
      <HelixDataTable label="Files" rowKey="id" rows={files}>
        <HelixTableColumn field="name" menu sortable>
          Name
        </HelixTableColumn>
      </HelixDataTable>,
    )
    await press('Name column menu')
    await act(async () => {
      fireEvent.press(screen.getByText('Sort descending'))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getAllByText(/^(archive|export)$/).map((node) => node.props.children)).toEqual([
      'export',
      'archive',
    ])
  })
})
