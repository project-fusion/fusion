/*
 * The generated Time Picker, drawn from its real intermediate form: the times of a
 * day in a list, a choice that asks first, a range kept in order, the times a rule
 * bars, the now press, and a set of wheels. `test:native` writes the components
 * beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixTimePicker } from './time-picker/index.native'

const draw = (content: ReactNode) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider mode="light" rem={16} tokens={light}>
        {content}
      </ThemeProvider>
    </GestureHandlerRootView>,
  )

const press = (words: string) =>
  act(async () => {
    fireEvent.press(screen.getByText(words))
  })

beforeEach(() => {
  setFocus(fakeFocus())
  setAnnounce(fakeAnnounce())
})

type Detail = { readonly detail: { readonly value?: string } }
type Target = { readonly target: { readonly value?: string } }

describe('the generated Time Picker', () => {
  test('lists the times from min to max at each step, written on the clock', async () => {
    await draw(<HelixTimePicker label="Starts" locale="en-US" max="10:00" min="09:00" step={30} />)
    expect(screen.getByText('9:00 AM')).toBeTruthy()
    expect(screen.getByText('9:30 AM')).toBeTruthy()
    expect(screen.getByText('10:00 AM')).toBeTruthy()
  })

  test('a choice asks before-change, then says input and change', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimePicker
        label="Starts"
        locale="en-US"
        max="10:00"
        min="09:00"
        onBeforeChange={(event: Detail) => heard.push(`before ${event.detail.value}`)}
        onChange={(event: Target) => heard.push(`change ${event.target.value}`)}
        onInput={(event: Target) => heard.push(`input ${event.target.value}`)}
        step={30}
      />,
    )
    await press('9:30 AM')
    expect(heard).toEqual(['before 09:30', 'input 09:30', 'change 09:30'])
  })

  test('a refused choice keeps the time', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimePicker
        defaultValue="09:00"
        label="Starts"
        locale="en-US"
        max="10:00"
        min="09:00"
        onBeforeChange={(event: { preventDefault: () => void }) => event.preventDefault()}
        onChange={() => heard.push('change')}
        step={30}
      />,
    )
    await press('9:30 AM')
    expect(heard).toEqual([])
  })

  test('a range keeps its two ends in order', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimePicker
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        mode="range"
        onChange={(event: Target) => heard.push(`${event.target.value}`)}
        step={30}
      />,
    )
    await press('10:30 AM')
    await press('9:30 AM')
    expect(heard.at(-1)).toBe('09:30,10:30')
  })

  test('a barred time takes no choice', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimePicker
        disableTimes="09:30"
        label="Starts"
        locale="en-US"
        max="10:00"
        min="09:00"
        onChange={() => heard.push('change')}
        step={30}
      />,
    )
    await press('9:30 AM')
    expect(heard).toEqual([])
  })

  test('the wheels turn one part of a time', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimePicker
        defaultValue="09:30"
        label="Starts"
        locale="en-GB"
        max="12:00"
        min="09:00"
        onChange={(event: Target) => heard.push(`${event.target.value}`)}
        picker="wheels"
        step={30}
      />,
    )
    expect(screen.getByText('09')).toBeTruthy()
    await press('11')
    expect(heard.at(-1)).toBe('11:30')
  })
})
