/*
 * The generated Pagination, drawn from its real intermediate form: a row of pages
 * a press moves through, a gap that goes to the middle of what it hides, a compact
 * row, a summary, and a page-size control. `test:native` writes the components
 * beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { styleOf } from './drawn'
import {
  HelixPagination,
  HelixPaginationSize,
  HelixPaginationSummary,
} from './pagination/index.native'

const draw = (content: ReactNode) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider mode="light" rem={16} tokens={light}>
        {content}
      </ThemeProvider>
    </GestureHandlerRootView>,
  )

const press = (name: string) =>
  act(async () => {
    fireEvent.press(screen.getByLabelText(name))
  })

const said = fakeAnnounce()

beforeEach(() => {
  setFocus(fakeFocus())
  setAnnounce(said)
})

describe('the generated Pagination', () => {
  test('a press on a page moves there, and tells what it asked', async () => {
    const before = jest.fn()
    const after = jest.fn()
    await draw(
      <HelixPagination defaultPage={4} onBeforeNavigate={before} onNavigate={after} pages={12} />,
    )
    await press('Page 5')
    expect(before).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Skip to page 3')).not.toBeNull()
  })

  test('a gap goes to the middle of what it hides', async () => {
    const after = jest.fn<(event: { detail: { page?: number } }) => void>()
    await draw(<HelixPagination defaultPage={4} onNavigate={after} pages={12} />)
    await press('Skip to page 9')
    expect(after.mock.calls[0]?.[0].detail.page).toBe(9)
  })

  test('a refused move stays on the page', async () => {
    await draw(
      <HelixPagination
        defaultPage={4}
        onBeforeNavigate={(event: { preventDefault: () => void }) => event.preventDefault()}
        pages={12}
      />,
    )
    await press('Next page')
    expect(screen.queryByLabelText('Skip to page 3')).toBeNull()
  })

  test('marks only the page under the finger while it is pressed', async () => {
    await draw(<HelixPagination defaultPage={4} pages={12} />)
    const under = screen.getByLabelText('Page 5')
    const beside = screen.getByLabelText('Page 3')
    await act(async () => {
      fireEvent(under, 'touchStart')
    })
    const press = styleOf(screen.getByLabelText('Page 5') as never).backgroundColor
    expect(press).toBe(light['color-press'])
    expect(styleOf(beside as never).backgroundColor).not.toBe(press)
    await act(async () => {
      fireEvent(under, 'touchEnd')
    })
    expect(styleOf(screen.getByLabelText('Page 5') as never).backgroundColor).not.toBe(press)
  })

  test('a compact row says the page and the count', async () => {
    await draw(<HelixPagination compact defaultPage={7} pages={24} />)
    expect(screen.getByText('7 of 24')).toBeTruthy()
  })

  test('a page-size control shows the size in force, and the first where it offers no other', async () => {
    await draw(<HelixPaginationSize defaultValue={7} label="Rows" sizes="10,25" />)
    expect(screen.getByText('10')).toBeTruthy()
  })

  test('a summary holds a page past the end to the last page', async () => {
    await draw(<HelixPaginationSummary page={99} pageSize={25} total={248} />)
    expect(screen.getByText('226-248 of 248')).toBeTruthy()
  })
})
