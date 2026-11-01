/*
 * The generated Button Group, drawn from its real intermediate form with the
 * real Button and Icon Button: one shape out of several buttons, with the
 * inner corners flat and each later button pulled onto its neighbor's edge,
 * in a row and in a column; a group a screen reader hears by its label; and,
 * in a selection mode, buttons that stay pressed, pressed by their own press
 * and the group asking first, with the arrow keys moving among them.
 * `test:native` writes the components beside this file, as the styled
 * package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixButton } from './button/index.native'
import { HelixButtonGroup, type HelixButtonGroupProps } from './button-group/index.native'
import { HelixIcon } from './icon/index.native'
import { HelixIconButton } from './icon-button/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The views listening for keys, each once, in the order they first started. */
let heard: unknown[] = []

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  focus = fakeFocus<unknown>()
  setFocus(focus)
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!heard.includes(node)) {
        heard.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Token name="color-background" />
    <Token name="color-foreground" />
    <Token name="size-control-lg" />
    <Token name="size-control-sm" />
    <Token name="space-xs" />
  </HelixTheme>
)

/** A token's value, as the theme drew it. */
const token = (name: string): string =>
  String(screen.getByTestId(new RegExp(`^token ${name} `)).props.testID).slice(
    `token ${name} `.length,
  )

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

type Drawn = { parent: Drawn | null; props: Record<string, unknown> & { style?: unknown } }

/** The press of the button named `name`, whichever role it is announced in. */
const press = (name: string) =>
  screen.queryByRole('button', { name }) ??
  screen.queryByRole('togglebutton', { name }) ??
  screen.getByRole('radio', { name })

/** The host view of the button named `name`: the view its press is drawn in. */
const hostOf = (name: string): Drawn => {
  let at = (press(name) as unknown as Drawn).parent
  while (at !== null && at.props.style === undefined) {
    at = at.parent
  }
  return at as Drawn
}

/** The corners of a button's press: top start, top end, bottom start, bottom end. */
const corners = (name: string) => {
  const drawn = styleOf(press(name))
  return [
    drawn.borderTopStartRadius,
    drawn.borderTopEndRadius,
    drawn.borderBottomStartRadius,
    drawn.borderBottomEndRadius,
  ]
}

/** Whether a screen reader hears the button pressed, or checked as a radio. */
const pressed = (name: string) => press(name).props.accessibilityState?.checked

/** The group's host view, which a screen reader hears by its label. */
const group = (label: string) => screen.getByLabelText(label) as unknown as Drawn

/** Presses `key` on the view that started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** Day, Week, and Month, joined. */
const Calendar = (props: HelixButtonGroupProps) =>
  themed(
    <HelixButtonGroup label="Calendar view" {...props}>
      <HelixButton value="day">Day</HelixButton>
      <HelixButton value="week">Week</HelixButton>
      <HelixButton value="month">Month</HelixButton>
    </HelixButtonGroup>,
  )

describe('the generated Button Group', () => {
  test('is a group named by its label, a row of plain buttons without a selection mode', async () => {
    await render(<Calendar />)
    expect(group('Calendar view').props.role).toBe('group')
    expect(styleOf(group('Calendar view'))).toMatchObject({ flexDirection: 'row' })
    for (const name of ['Day', 'Week', 'Month']) {
      expect(press(name).props.accessibilityRole).toBe('button')
      expect(press(name).props.accessibilityState?.checked).toBeUndefined()
    }
  })

  test('joins a row into one shape: the inner corners flat, and each later button on its neighbor’s edge', async () => {
    await render(<Calendar />)
    expect(corners('Day')).toEqual([4, 0, 4, 0])
    expect(corners('Week')).toEqual([0, 0, 0, 0])
    expect(corners('Month')).toEqual([0, 4, 0, 4])
    expect(styleOf(hostOf('Day')).marginStart).toBeUndefined()
    expect(styleOf(hostOf('Week')).marginStart).toBe(-1)
    expect(styleOf(hostOf('Month')).marginStart).toBe(-1)
  })

  test('joins a column along its other axis, the outer corners at its top and bottom', async () => {
    await render(<Calendar orientation="vertical" />)
    expect(styleOf(group('Calendar view'))).toMatchObject({
      alignItems: 'stretch',
      flexDirection: 'column',
    })
    expect(corners('Day')).toEqual([4, 4, 0, 0])
    expect(corners('Week')).toEqual([0, 0, 0, 0])
    expect(corners('Month')).toEqual([0, 0, 4, 4])
    expect(styleOf(hostOf('Week'))).toMatchObject({ marginStart: 0, marginTop: -1 })
  })

  test('keeps every corner and parts its buttons with a gap while spaced', async () => {
    await render(<Calendar layout="spaced" />)
    expect(styleOf(group('Calendar view')).gap).toBe(Number(token('space-xs')))
    for (const name of ['Day', 'Week', 'Month']) {
      expect(corners(name)).toEqual([4, 4, 4, 4])
      expect(styleOf(hostOf(name)).marginStart).toBeUndefined()
    }
  })

  test('flattens an icon button’s corners as it flattens a button’s', async () => {
    await render(
      themed(
        <HelixButtonGroup label="Format">
          <HelixIconButton label="Bold">
            <HelixIcon name="text-b" />
          </HelixIconButton>
          <HelixIconButton label="Italic">
            <HelixIcon name="text-italic" />
          </HelixIconButton>
        </HelixButtonGroup>,
      ),
    )
    expect(corners('Bold')).toEqual([4, 0, 4, 0])
    expect(corners('Italic')).toEqual([0, 4, 0, 4])
  })

  test('is a toolbar of toggle buttons under `multiple`, pressed by a tap, asking first and then telling', async () => {
    const told: string[] = []
    await render(
      <Calendar
        onBeforeChange={(event) => told.push(`before-change ${event.detail.value}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        selectionMode="multiple"
        value="day"
      />,
    )
    expect(group('Calendar view').props.accessibilityRole).toBe('toolbar')
    expect(press('Day').props.accessibilityRole).toBe('togglebutton')
    expect([pressed('Day'), pressed('Week'), pressed('Month')]).toEqual([true, false, false])
    await fireEvent.press(press('Month'))
    expect([pressed('Day'), pressed('Month')]).toEqual([true, true])
    await fireEvent.press(press('Day'))
    expect([pressed('Day'), pressed('Month')]).toEqual([false, true])
    await fireEvent.press(press('Week'))
    /* Written as the web writes them: in the order they were pressed, with a comma and a space. */
    expect(told).toEqual([
      'before-change day, month',
      'change day, month',
      'before-change month',
      'change month',
      'before-change month, week',
      'change month, week',
    ])
  })

  test('is a radio group under `single`, a press choosing one and a press on it letting go', async () => {
    await render(<Calendar selectionMode="single" value="week" />)
    expect(group('Calendar view').props.accessibilityRole).toBe('radiogroup')
    expect(press('Week').props.accessibilityRole).toBe('radio')
    await fireEvent.press(press('Month'))
    expect([pressed('Week'), pressed('Month')]).toEqual([false, true])
    await fireEvent.press(press('Month'))
    expect(pressed('Month')).toBe(false)
  })

  test('keeps the buttons as they are where the group refuses the change, or keeps one pressed', async () => {
    const view = await render(
      <Calendar
        onBeforeChange={(event) => event.preventDefault()}
        selectionMode="multiple"
        value="day"
      />,
    )
    await fireEvent.press(press('Week'))
    expect(pressed('Week')).toBe(false)
    await view.rerender(<Calendar disallowEmptySelection selectionMode="single" value="day" />)
    await fireEvent.press(press('Day'))
    expect(pressed('Day')).toBe(true)
  })

  test('presses a button with Space or Enter, and moves focus with the arrows without pressing', async () => {
    await render(<Calendar selectionMode="multiple" />)
    await pressKey(0, ' ')
    expect(pressed('Day')).toBe(true)
    await pressKey(1, 'Enter')
    expect(pressed('Week')).toBe(true)
    await pressKey(2, 'ArrowRight')
    expect(focus.focused()).toBe(heard[0])
    await pressKey(0, 'ArrowLeft')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'Home')
    expect(focus.focused()).toBe(heard[0])
    expect(pressed('Month')).toBe(false)
  })

  test('moves no focus with the arrows without a selection mode, where each button is its own', async () => {
    await render(<Calendar />)
    await pressKey(0, 'ArrowRight')
    expect(focus.moved).toEqual([])
  })

  test('disables every button while it is disabled, and gives each back its own state after', async () => {
    const view = await render(<Calendar disabled selectionMode="single" value="week" />)
    expect(group('Calendar view').props.accessibilityState).toEqual({ disabled: true })
    for (const name of ['Day', 'Week', 'Month']) {
      expect(press(name).props.accessibilityState).toMatchObject({ disabled: true })
    }
    await fireEvent.press(press('Day'))
    expect(pressed('Week')).toBe(true)
    await view.rerender(<Calendar selectionMode="single" value="week" />)
    expect(press('Day').props.accessibilityState).toMatchObject({ disabled: false })
  })

  test('draws a pressed button in the solid fill: the ink behind it and the page’s color for its words', async () => {
    await render(<Calendar selectionMode="multiple" value="week" />)
    const fill = styleOf(press('Week'))
    expect(fill).toMatchObject({
      backgroundColor: token('color-foreground'),
      borderColor: token('color-foreground'),
    })
    expect(styleOf(screen.getByText('Week')).color).toBe(token('color-background'))
    expect(styleOf(press('Day')).backgroundColor).not.toBe(token('color-foreground'))
  })

  test('announces a pressed icon button and draws it in the solid fill, as a pressed button', async () => {
    await render(
      themed(
        <HelixButtonGroup label="Format" selectionMode="multiple" value="bold">
          <HelixIconButton label="Bold" value="bold">
            <HelixIcon name="text-b" />
          </HelixIconButton>
          <HelixIconButton label="Italic" value="italic">
            <HelixIcon name="text-italic" />
          </HelixIconButton>
        </HelixButtonGroup>,
      ),
    )
    expect([pressed('Bold'), pressed('Italic')]).toEqual([true, false])
    expect(styleOf(press('Bold'))).toMatchObject({
      backgroundColor: token('color-foreground'),
      borderColor: token('color-foreground'),
    })
    expect(styleOf(press('Italic')).backgroundColor).not.toBe(token('color-foreground'))
  })

  test('sizes every button with `size`, and stops their height at 1.353 times at the largest text size', async () => {
    const view = await render(<Calendar size="sm" />)
    expect(styleOf(press('Day')).height).toBe(Number(token('size-control-sm')))
    await view.rerender(<Calendar size="lg" />)
    const tall = Number(token('size-control-lg'))
    expect(styleOf(press('Day')).height).toBe(tall)
    const words = styleOf(screen.getByText('Day')).fontSize as number
    await act(() => atTextSize(3.571))
    /* Above the largest standard size, a control's height is the least it can be. */
    expect(styleOf(press('Day')).minHeight).toBeCloseTo(tall * 1.353, 1)
    expect(styleOf(screen.getByText('Day')).fontSize).toBeCloseTo(words * 3.571, 1)
  })
})
