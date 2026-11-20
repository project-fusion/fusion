/*
 * The generated Date Picker, drawn from its real intermediate form: a month of six
 * weeks, a press that chooses one date, a range, or several, the controls that
 * page the months, and the heading that steps back to the months and the years.
 * `test:native` writes the components beside this file.
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
import { HelixDatePicker } from './date-picker/index.native'
import { styleOf } from './drawn'

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

type Detail = { readonly detail: { readonly value?: string } }
type Target = { readonly target: { readonly value?: string } }

describe('the generated Date Picker', () => {
  test('draws a month of six weeks under its heading, its days named in full', async () => {
    await draw(<HelixDatePicker defaultMonth="2026-08" locale="en-US" />)
    expect(screen.getByText('August 2026')).toBeTruthy()
    expect(screen.getByText('Sun')).toBeTruthy()
    expect(screen.getByLabelText('Tuesday, August 4, 2026')).toBeTruthy()
    /* Six weeks from July 26 to September 5. */
    expect(screen.getByLabelText('Sunday, July 26, 2026')).toBeTruthy()
    expect(screen.getByLabelText('Saturday, September 5, 2026')).toBeTruthy()
  })

  test('a press asks before-change, then says input and change', async () => {
    const heard: string[] = []
    await draw(
      <HelixDatePicker
        defaultMonth="2026-08"
        locale="en-US"
        onBeforeChange={(event: Detail) => heard.push(`before ${event.detail.value}`)}
        onChange={(event: Target) => heard.push(`change ${event.target.value}`)}
        onInput={(event: Target) => heard.push(`input ${event.target.value}`)}
      />,
    )
    await press('Tuesday, August 4, 2026')
    expect(heard).toEqual(['before 2026-08-04', 'input 2026-08-04', 'change 2026-08-04'])
    expect(said.said.at(-1)?.message).toBe('Selected date: August 4, 2026')
  })

  test('a refused change leaves the dates as they were', async () => {
    const change = jest.fn()
    await draw(
      <HelixDatePicker
        defaultValue="2026-08-10"
        locale="en-US"
        onBeforeChange={(event: { preventDefault: () => void }) => event.preventDefault()}
        onChange={change}
      />,
    )
    await press('Tuesday, August 4, 2026')
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Monday, August 10, 2026').props.accessibilityState).toMatchObject(
      { selected: true },
    )
  })

  test('a range takes two ends, in order, and bands the days between', async () => {
    const change = jest.fn<(event: Target) => void>()
    await draw(
      <HelixDatePicker defaultMonth="2026-08" locale="en-US" mode="range" onChange={change} />,
    )
    await press('Monday, August 10, 2026')
    await press('Tuesday, August 4, 2026')
    expect(change.mock.calls.at(-1)?.[0].target.value).toBe('2026-08-04,2026-08-10')
    const middle = screen.getByLabelText('Friday, August 7, 2026')
    expect(middle.props.accessibilityState).toMatchObject({ selected: true })
    expect(styleOf(middle).backgroundColor).toBeDefined()
  })

  test('Next asks before-navigate and moves a month, and min stops Previous', async () => {
    const navigate = jest.fn<(event: Detail) => void>()
    await draw(
      <HelixDatePicker
        defaultMonth="2026-08"
        locale="en-US"
        min="2026-08-03"
        onNavigate={navigate}
      />,
    )
    expect(screen.getAllByLabelText('Previous month')[0]?.props.accessibilityState).toMatchObject({
      disabled: true,
    })
    await press('Next month')
    expect(navigate.mock.calls[0]?.[0].detail.value).toBe('2026-09')
    expect(screen.getByText('September 2026')).toBeTruthy()
    expect(said.said.at(-1)?.message).toBe('September 2026')
  })

  test('a day the rules bar takes no press', async () => {
    const change = jest.fn()
    await draw(
      <HelixDatePicker defaultMonth="2026-08" disableDays="0,6" locale="en-US" onChange={change} />,
    )
    await press('Saturday, August 8, 2026')
    expect(change).not.toHaveBeenCalled()
  })

  test('the heading steps back to the months, and a month shows its days', async () => {
    await draw(<HelixDatePicker defaultMonth="2026-08" locale="en-US" maxView="year" />)
    await press('August 2026. Choose a month')
    expect(screen.getByLabelText('Mar 2026')).toBeTruthy()
    await press('2026. Choose a year')
    /* A page of twelve years, 2016 to 2027. */
    expect(screen.getByText('2016 – 2027')).toBeTruthy()
    await press('2020')
    await press('Mar 2020')
    expect(screen.getByText('March 2020')).toBeTruthy()
  })
})
