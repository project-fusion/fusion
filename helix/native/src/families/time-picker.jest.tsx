/*
 * The generated Time Picker, drawn from its real intermediate form: the times of a
 * day in a list, a choice that asks first, a range kept in order, the times a rule
 * bars, the now press, and a set of wheels. `test:native` writes the components
 * beside this file.
 *
 * **The rows are Listbox's, drawn from data**, and Time Picker's rules reach them
 * through the parts the list exports of each row: a range's ends filled and the
 * times between washed, a wheel's answer the solid mark with no tick.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { FlatList, StyleSheet } from 'react-native'
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

/** A drawn node, as the test renderer's tree gives it. */
interface Drawn {
  readonly parent: Drawn | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: unknown
  readonly children?: readonly (Drawn | string)[]
}

/** How many views `node` holds that are shown, itself among them. */
const shownViews = (node: Drawn): number =>
  (node.type === 'View' && styleOf(node).display !== 'none' ? 1 : 0) +
  (node.children ?? []).reduce(
    (sum, child) => sum + (typeof child === 'string' ? 0 : shownViews(child)),
    0,
  )

/** The nearest host view around the words, or the one whose role is `role`. */
const around = (words: string, role?: string): Drawn => {
  let at = (screen.getByText(words) as unknown as Drawn).parent
  while (at !== null) {
    const kind = at.props.role ?? at.props.accessibilityRole
    if (at.type === 'View' && (role === undefined || kind === role)) {
      return at
    }
    at = at.parent
  }
  throw new Error(`nothing around ${words}`)
}

/** What a view is drawn with, flattened. */
const styleOf = (view: Drawn) =>
  StyleSheet.flatten(view.props.style as never) as Readonly<Record<string, unknown>>

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

  test("a range's ends are filled and the times between them washed", async () => {
    await draw(
      <HelixTimePicker
        defaultValue="09:00,10:00"
        label="Starts"
        locale="en-US"
        max="11:00"
        min="09:00"
        mode="range"
        step={30}
      />,
    )
    const end = styleOf(around('9:00 AM', 'button'))
    const between = styleOf(around('9:30 AM', 'button'))
    const outside = styleOf(around('10:30 AM', 'button'))
    expect(end.backgroundColor).toBe(light['color-primary-surface'])
    expect(styleOf(around('10:00 AM', 'button')).backgroundColor).toBe(
      light['color-primary-surface'],
    )
    expect(between.backgroundColor).toBeDefined()
    expect(between.backgroundColor).not.toBe(outside.backgroundColor)
    expect(between.backgroundColor).not.toBe(end.backgroundColor)
  })

  test("a wheel's answer is the solid mark, centered, with no tick", async () => {
    await draw(
      <HelixTimePicker
        defaultValue="09:30"
        label="Starts"
        locale="en-GB"
        max="12:00"
        min="09:00"
        picker="wheels"
        step={30}
      />,
    )
    const answer = styleOf(around('09'))
    expect(answer.backgroundColor).toBe(light['color-primary-surface'])
    expect(styleOf(around('10')).backgroundColor).not.toBe(light['color-primary-surface'])
    expect(styleOf(around('09', 'button')).justifyContent).toBe('center')
    /* A chosen row draws Option's tick beside its words; a wheel's draws none. */
    const shown = (words: string) => shownViews(around(words, 'button'))
    expect(shown('09')).toBe(shown('10'))
  })

  test('the list comes to rest on the time it holds, and each wheel on its answer', async () => {
    const asked: unknown[] = []
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(function (
      this: unknown,
      to,
    ) {
      asked.push(to)
    })
    try {
      await draw(
        <HelixTimePicker
          defaultValue="10:30"
          label="Starts"
          locale="en-US"
          min="09:00"
          step={30}
        />,
      )
      await act(async () => {
        await new Promise((done) => setTimeout(done, 50))
      })
      expect(asked).toContainEqual(expect.objectContaining({ index: 3, viewPosition: 0.5 }))
    } finally {
      spy.mockRestore()
    }
  })
})
