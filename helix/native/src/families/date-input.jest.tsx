/*
 * The generated Date Input, drawn from its real intermediate form: the written date
 * at rest and the value while edited, the calendar its trigger opens, a pick there
 * that asks first, a range and several, the clear, and the rows of segments.
 * `test:native` writes the components beside this file.
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
import { HelixDateInput } from './date-input/index.native'

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

beforeEach(() => {
  setFocus(fakeFocus())
  setAnnounce(fakeAnnounce())
})

type Detail = { readonly detail: { readonly value?: string } }
type Target = { readonly target: { readonly value?: string } }

const field = () => screen.getByLabelText('Starts')

/** The nearest view around some words that takes a screen reader's actions. */
const actionsOf = (words: string) => {
  type Held = { readonly parent: unknown; readonly props: Record<string, unknown> }
  let at: Held | null = screen.getByText(words) as unknown as Held
  while (at !== null && at.props.accessibilityActions === undefined) {
    at = at.parent as Held | null
  }
  return at
}

describe('the generated Date Input', () => {
  test('shows the date written at rest and the value while edited', async () => {
    await draw(<HelixDateInput defaultValue="2026-08-04" label="Starts" locale="en-US" />)
    expect(field().props.value).toBe('August 4, 2026')
    await act(async () => {
      fireEvent(field(), 'focus')
    })
    expect(field().props.value).toBe('2026-08-04')
  })

  test('typing asks before-change and says input, and change once the reader leaves', async () => {
    const heard: string[] = []
    await draw(
      <HelixDateInput
        label="Starts"
        locale="en-US"
        onBeforeChange={(event: Detail) => heard.push(`before ${event.detail.value}`)}
        onChange={(event: Target) => heard.push(`change ${event.target.value}`)}
        onInput={(event: Target) => heard.push(`input ${event.target.value}`)}
      />,
    )
    await act(async () => {
      fireEvent(field(), 'focus')
      fireEvent.changeText(field(), '2026-08-04')
    })
    await act(async () => {
      fireEvent(field(), 'blur')
    })
    expect(heard).toEqual(['before 2026-08-04', 'input 2026-08-04', 'change 2026-08-04'])
  })

  test('reads a written date back as the reader leaves', async () => {
    await draw(<HelixDateInput label="Starts" locale="en-US" />)
    await act(async () => {
      fireEvent(field(), 'focus')
      fireEvent.changeText(field(), 'Aug 4, 2026')
    })
    await act(async () => {
      fireEvent(field(), 'blur')
    })
    expect(field().props.value).toBe('August 4, 2026')
  })

  test('the trigger opens the calendar, and a pick there fills the field and closes it', async () => {
    const heard: string[] = []
    await draw(
      <HelixDateInput
        defaultValue="2026-08-04"
        label="Starts"
        locale="en-US"
        onChange={(event: Target) => heard.push(`change ${event.target.value}`)}
        onToggle={(event: { readonly detail: { readonly newState?: string } }) =>
          heard.push(`toggle ${event.detail.newState}`)
        }
      />,
    )
    await press('Choose a date')
    expect(screen.getByText('August 2026')).toBeTruthy()
    await press('Tuesday, August 11, 2026')
    expect(field().props.value).toBe('August 11, 2026')
    expect(heard).toContain('change 2026-08-11')
    expect(heard.filter((one) => one.startsWith('toggle'))).toEqual([
      'toggle open',
      'toggle closed',
    ])
  })

  test('a refused pick leaves the field and the calendar on the date it holds', async () => {
    await draw(
      <HelixDateInput
        defaultValue="2026-08-04"
        label="Starts"
        locale="en-US"
        onBeforeChange={(event: { preventDefault: () => void }) => event.preventDefault()}
      />,
    )
    await press('Choose a date')
    await press('Tuesday, August 11, 2026')
    expect(field().props.value).toBe('August 4, 2026')
    expect(
      screen.getByLabelText('Tuesday, August 4, 2026').props.accessibilityState?.selected,
    ).toBe(true)
  })

  test('a range stays open between its two dates and shows them with a dash', async () => {
    await draw(
      <HelixDateInput defaultValue="2026-08-04" label="Starts" locale="en-US" mode="range" />,
    )
    await press('Choose a date')
    await press('Tuesday, August 11, 2026')
    expect(screen.getByText('August 2026')).toBeTruthy()
    expect(field().props.value).toBe('August 4, 2026 – August 11, 2026')
  })

  test('several draw a tag each, and a tag takes its date away', async () => {
    await draw(
      <HelixDateInput
        defaultValue="2026-08-04,2026-08-11"
        label="Starts"
        locale="en-US"
        mode="multiple"
      />,
    )
    expect(screen.getByText('August 4, 2026')).toBeTruthy()
    /* A screen reader removes a tag by its own action, as the remove press is hidden from it. */
    await act(async () => {
      fireEvent(actionsOf('August 4, 2026') as never, 'accessibilityAction', {
        nativeEvent: { actionName: 'dismiss' },
      })
    })
    expect(screen.queryByText('August 4, 2026')).toBeNull()
    expect(screen.getByText('August 11, 2026')).toBeTruthy()
  })

  test('the clear empties the field and says clear', async () => {
    const heard: string[] = []
    await draw(
      <HelixDateInput
        clearable
        defaultValue="2026-08-04"
        label="Starts"
        locale="en-US"
        onClear={() => heard.push('clear')}
      />,
    )
    await press('Clear')
    expect(field().props.value).toBe('')
    expect(heard).toEqual(['clear'])
    expect(screen.queryByLabelText('Clear')).toBeNull()
  })

  test('a date outside the bounds is invalid, with the bound written', async () => {
    await draw(<HelixDateInput label="Starts" locale="en-US" min="2026-09-01" />)
    await act(async () => {
      fireEvent(field(), 'focus')
      fireEvent.changeText(field(), '2026-08-04')
    })
    await act(async () => {
      fireEvent(field(), 'blur')
    })
    expect(screen.getByText('Choose a date on or after September 1, 2026.')).toBeTruthy()
  })

  test('segments take digits in the locale order and make the value', async () => {
    const heard: string[] = []
    await draw(
      <HelixDateInput
        label="Starts"
        locale="en-US"
        onInput={(event: Target) => heard.push(`input ${event.target.value}`)}
        segmented
      />,
    )
    const month = screen.getByLabelText('month, Starts')
    expect(month.props.value).toBe('')
    expect(month.props.placeholder).toBe('––')
    await act(async () => {
      fireEvent.changeText(month, '8')
    })
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('day, Starts'), '4')
    })
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('year, Starts'), '2026')
    })
    expect(screen.getByLabelText('month, Starts').props.value).toBe('08')
    expect(heard.at(-1)).toBe('input 2026-08-04')
  })

  test('a pick in the calendar is what the segments show', async () => {
    await draw(<HelixDateInput defaultValue="2026-08-04" label="Starts" locale="en-US" segmented />)
    await press('Choose a date')
    await press('Tuesday, August 11, 2026')
    expect(screen.getByLabelText('day, Starts').props.value).toBe('11')
  })

  test('two digits typed one at a time run on in one segment', async () => {
    await draw(<HelixDateInput defaultValue="2026-08-04" label="Starts" locale="en-US" segmented />)
    const day = () => screen.getByLabelText('day, Starts')
    await act(async () => {
      fireEvent(day(), 'focus')
    })
    await act(async () => {
      fireEvent.changeText(day(), '042')
    })
    expect(day().props.value).toBe('02')
    await act(async () => {
      fireEvent.changeText(day(), '027')
    })
    expect(day().props.value).toBe('27')
  })

  test('a screen reader steps a segment up and down', async () => {
    await draw(<HelixDateInput defaultValue="2026-08-04" label="Starts" locale="en-US" segmented />)
    await act(async () => {
      fireEvent(screen.getByLabelText('day, Starts'), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      })
    })
    expect(screen.getByLabelText('day, Starts').props.value).toBe('05')
  })
})
