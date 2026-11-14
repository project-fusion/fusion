/*
 * The generated Time Input, drawn from its real intermediate form: the written time
 * at rest and the value while edited, the list its trigger opens, a pick there that
 * asks first, the wheels that stay open, a range and several, the clear, and the
 * rows of segments. `test:native` writes the components beside this file.
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
import { HelixTimeInput } from './time-input/index.native'

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

/** A time in the list, found by its words, as a reader sees it. */
const pick = (words: string) =>
  act(async () => {
    fireEvent.press(screen.getByText(words))
  })

beforeEach(() => {
  setFocus(fakeFocus())
  setAnnounce(fakeAnnounce())
})

type Target = { readonly target: { readonly value?: string } }

/** The field, which the list in an open panel shares its name with, coming first. */
const field = () => screen.getAllByLabelText('Starts')[0] as ReturnType<typeof screen.getByText>

/** The nearest view around some words that takes a screen reader's actions. */
const actionsOf = (words: string) => {
  type Held = { readonly parent: unknown; readonly props: Record<string, unknown> }
  let at: Held | null = screen.getByText(words) as unknown as Held
  while (at !== null && at.props.accessibilityActions === undefined) {
    at = at.parent as Held | null
  }
  return at
}

describe('the generated Time Input', () => {
  test('shows the time written at rest and the value while edited', async () => {
    await draw(<HelixTimeInput defaultValue="14:30" label="Starts" locale="en-US" />)
    expect(field().props.value).toBe('2:30 PM')
    await act(async () => {
      fireEvent(field(), 'focus')
    })
    expect(field().props.value).toBe('14:30')
  })

  test('reads a written time back as the reader leaves', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimeInput
        label="Starts"
        locale="en-US"
        onChange={(event: Target) => heard.push(`change ${event.target.value}`)}
      />,
    )
    await act(async () => {
      fireEvent(field(), 'focus')
      fireEvent.changeText(field(), '2:30 PM')
    })
    await act(async () => {
      fireEvent(field(), 'blur')
    })
    expect(field().props.value).toBe('2:30 PM')
    expect(heard.at(-1)).toBe('change 14:30')
  })

  test('the trigger opens the list, and a pick there fills the field and closes it', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimeInput
        defaultValue="09:00"
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        onToggle={(event: { readonly detail: { readonly newState?: string } }) =>
          heard.push(`toggle ${event.detail.newState}`)
        }
        step={30}
      />,
    )
    await press('Choose a time')
    await pick('9:30 AM')
    expect(field().props.value).toBe('9:30 AM')
    expect(heard).toEqual(['toggle open', 'toggle closed'])
  })

  test('a refused pick leaves the field on the time it holds', async () => {
    await draw(
      <HelixTimeInput
        defaultValue="09:00"
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        onBeforeChange={(event: { preventDefault: () => void }) => event.preventDefault()}
        step={30}
      />,
    )
    await press('Choose a time')
    await pick('9:30 AM')
    expect(field().props.value).toBe('9:00 AM')
  })

  test('the wheels stay open as a part of the time turns', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimeInput
        defaultValue="09:00"
        hourCycle="h23"
        label="Starts"
        locale="en-US"
        max="12:00"
        min="09:00"
        onToggle={(event: { readonly detail: { readonly newState?: string } }) =>
          heard.push(`toggle ${event.detail.newState}`)
        }
        picker="wheels"
        step={30}
      />,
    )
    await press('Choose a time')
    await pick('11')
    expect(field().props.value).toBe('11:00')
    expect(heard).toEqual(['toggle open'])
  })

  test('a range stays open between its two times and shows them with a dash', async () => {
    await draw(
      <HelixTimeInput
        defaultValue="09:00"
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        mode="range"
        step={30}
      />,
    )
    await press('Choose a time')
    await pick('10:30 AM')
    expect(field().props.value).toBe('9:00 AM – 10:30 AM')
    expect(screen.getByText('10:00 AM')).toBeTruthy()
  })

  test('several draw a tag each, and a tag takes its time away', async () => {
    await draw(
      <HelixTimeInput defaultValue="09:00,14:30" label="Starts" locale="en-US" mode="multiple" />,
    )
    expect(screen.getByText('9:00 AM')).toBeTruthy()
    await act(async () => {
      fireEvent(actionsOf('9:00 AM') as never, 'accessibilityAction', {
        nativeEvent: { actionName: 'dismiss' },
      })
    })
    expect(screen.queryByText('9:00 AM')).toBeNull()
    expect(screen.getByText('2:30 PM')).toBeTruthy()
  })

  test('the clear empties the field and says clear', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimeInput
        clearable
        defaultValue="14:30"
        label="Starts"
        locale="en-US"
        onClear={() => heard.push('clear')}
      />,
    )
    await press('Clear')
    expect(field().props.value).toBe('')
    expect(heard).toEqual(['clear'])
  })

  test('a time outside the bounds is invalid, with the bound written', async () => {
    await draw(<HelixTimeInput label="Starts" locale="en-US" min="09:00" />)
    await act(async () => {
      fireEvent(field(), 'focus')
      fireEvent.changeText(field(), '08:15')
    })
    await act(async () => {
      fireEvent(field(), 'blur')
    })
    expect(screen.getByText('Choose a time at or after 9:00 AM.')).toBeTruthy()
  })

  test('segments take digits on the clock and make the value', async () => {
    const heard: string[] = []
    await draw(
      <HelixTimeInput
        hourCycle="h23"
        label="Starts"
        locale="en-US"
        onInput={(event: Target) => heard.push(`input ${event.target.value}`)}
        segmented
      />,
    )
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('hour, Starts'), '14')
    })
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('minute, Starts'), '30')
    })
    expect(screen.getByLabelText('hour, Starts').props.value).toBe('14')
    expect(heard.at(-1)).toBe('input 14:30')
  })

  test('a pick in the list is what the segments show', async () => {
    await draw(
      <HelixTimeInput
        defaultValue="09:00"
        hourCycle="h23"
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        segmented
        step={30}
      />,
    )
    await press('Choose a time')
    await pick('09:30')
    expect(screen.getByLabelText('minute, Starts').props.value).toBe('30')
  })
})
