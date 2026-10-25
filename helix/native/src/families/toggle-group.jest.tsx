/*
 * The generated Toggle Group, drawn from its real intermediate form with the
 * generated Toggle: a radio group of radios where one is chosen, a toolbar of
 * toggle buttons where several can be pressed, the group asking before the
 * answer moves, the arrow keys, and the look a group gives its toggles.
 * `test:native` writes the components beside this file, as the styled
 * package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Dimensions, View } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { ToolbarAxisContext } from '../render/toolbar'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixToggle, HelixToggleGroup, type HelixToggleGroupProps } from './toggle/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The parts listening for keys, in the order they started: each toggle's press. */
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
      heard.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

const TOKENS = [
  'border-thin',
  'color-border',
  'color-danger',
  'color-foreground',
  'color-surface-overlay',
  'color-surface-raised',
  'size-control',
  'space-2xs',
]

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    {TOKENS.map((name) => (
      <Token key={name} name={name} />
    ))}
  </HelixTheme>
)

/** A token's value, as the theme drew it. */
const token = (name: string): string =>
  String(screen.getByTestId(new RegExp(`^token ${name} `)).props.testID).slice(
    `token ${name} `.length,
  )

/** Presses `key` on the toggle whose press started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** Every view drawn with this role, in order. */
const withRole = (role: string): Drawn[] =>
  nodes(screen.toJSON()).filter(
    (node) => node.props.accessibilityRole === role || node.props.role === role,
  )

/** Whether a screen reader hears the item named by its words checked, or pressed. */
const checked = (role: 'radio' | 'togglebutton', name: string): unknown =>
  screen.getByRole(role, { name }).props.accessibilityState?.checked

/** Three views, the last disabled where `last` is off. */
const Views = (props: HelixToggleGroupProps & { readonly last?: boolean }) =>
  themed(
    <HelixToggleGroup defaultValue="list" label="View" {...props}>
      <HelixToggle value="list">List</HelixToggle>
      <HelixToggle value="grid">Grid</HelixToggle>
      <HelixToggle disabled={props.last === false} value="board">
        Board
      </HelixToggle>
    </HelixToggleGroup>,
  )

/** Three formats, several of which can be pressed. */
const Formats = (props: HelixToggleGroupProps) =>
  themed(
    <HelixToggleGroup label="Format" selectionMode="multiple" {...props}>
      <HelixToggle value="bold">Bold</HelixToggle>
      <HelixToggle value="italic">Italic</HelixToggle>
      <HelixToggle value="underline">Underline</HelixToggle>
    </HelixToggleGroup>,
  )

describe('a toggle group that chooses one', () => {
  test('is a radio group named by its label, and each toggle a radio checked while it is chosen', async () => {
    await render(<Views />)
    expect(withRole('radiogroup').map((node) => node.props.accessibilityLabel)).toEqual(['View'])
    expect([checked('radio', 'List'), checked('radio', 'Grid'), checked('radio', 'Board')]).toEqual(
      [true, false, false],
    )
  })

  test('chooses on a press, asking the toggle, then the group, then telling', async () => {
    const told: string[] = []
    await render(
      <Views
        onBeforeChange={(event) => told.push(`before-change ${event.detail.value}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        onInput={() => told.push('input')}
        onSelect={(event) => told.push(`select ${event.detail.value}`)}
      />,
    )
    await fireEvent.press(screen.getByRole('radio', { name: 'Grid' }))
    expect([checked('radio', 'List'), checked('radio', 'Grid')]).toEqual([false, true])
    expect(told).toEqual(['select grid', 'before-change grid', 'input', 'change grid'])
  })

  test('keeps its choice where the group refuses the change, or the toggle its choice', async () => {
    const view = await render(<Views onBeforeChange={(event) => event.preventDefault()} />)
    await fireEvent.press(screen.getByRole('radio', { name: 'Grid' }))
    expect(checked('radio', 'List')).toBe(true)
    await view.rerender(<Views onSelect={(event) => event.preventDefault()} />)
    await fireEvent.press(screen.getByRole('radio', { name: 'Grid' }))
    expect(checked('radio', 'List')).toBe(true)
  })

  test('keeps the chosen toggle on a press, and takes it back under `allowEmptySelection`', async () => {
    const view = await render(<Views />)
    await fireEvent.press(screen.getByRole('radio', { name: 'List' }))
    expect(checked('radio', 'List')).toBe(true)
    await view.rerender(<Views allowEmptySelection />)
    await fireEvent.press(screen.getByRole('radio', { name: 'List' }))
    expect(checked('radio', 'List')).toBe(false)
  })

  test('chooses where the arrows arrive, comes round, and passes over a disabled toggle', async () => {
    await render(<Views last={false} />)
    await pressKey(0, 'ArrowRight')
    expect(checked('radio', 'Grid')).toBe(true)
    await pressKey(1, 'ArrowRight')
    expect(checked('radio', 'List')).toBe(true)
    await pressKey(0, 'End')
    expect(checked('radio', 'Grid')).toBe(true)
    await pressKey(1, 'g')
    expect(checked('radio', 'Grid')).toBe(true)
  })

  test('opens on a toggle written `selected` where nothing else names the answer', async () => {
    await render(
      themed(
        <HelixToggleGroup label="View">
          <HelixToggle value="list">List</HelixToggle>
          <HelixToggle selected value="grid">
            Grid
          </HelixToggle>
        </HelixToggleGroup>,
      ),
    )
    expect([checked('radio', 'List'), checked('radio', 'Grid')]).toEqual([false, true])
  })

  test('disables every toggle while it is disabled', async () => {
    await render(<Views disabled />)
    for (const name of ['List', 'Grid', 'Board']) {
      expect(screen.getByRole('radio', { name }).props.accessibilityState).toMatchObject({
        disabled: true,
      })
    }
    await fireEvent.press(screen.getByRole('radio', { name: 'Grid' }))
    expect(checked('radio', 'List')).toBe(true)
  })
})

describe('a toggle group where several can be pressed', () => {
  test('is a toolbar of toggle buttons, each pressed while its value is in the group’s', async () => {
    await render(<Formats defaultValue="bold,underline" />)
    expect(withRole('toolbar').map((node) => node.props.accessibilityLabel)).toEqual(['Format'])
    expect(['Bold', 'Italic', 'Underline'].map((name) => checked('togglebutton', name))).toEqual([
      true,
      false,
      true,
    ])
  })

  test('presses or releases one toggle, and tells the pressed values in the order they stand', async () => {
    const told: string[] = []
    await render(
      <Formats
        defaultValue="underline"
        onBeforeChange={(event) => told.push(`before-change ${event.detail.value}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
      />,
    )
    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Bold' }))
    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Underline' }))
    expect(told).toEqual([
      'before-change bold,underline',
      'change bold,underline',
      'before-change bold',
      'change bold',
    ])
    expect(checked('togglebutton', 'Bold')).toBe(true)
  })

  test('moves focus with the arrows and presses nothing', async () => {
    await render(<Formats />)
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[1])
    expect(checked('togglebutton', 'Italic')).toBe(false)
  })

  test('is a group inside a toolbar, so a reader meets one toolbar', async () => {
    await render(
      <ToolbarAxisContext.Provider value="horizontal">
        <Formats />
      </ToolbarAxisContext.Provider>,
    )
    expect(withRole('toolbar')).toEqual([])
    expect(withRole('group').map((node) => node.props.accessibilityLabel)).toEqual(['Format'])
  })

  test('draws the indicator’s fill on each pressed toggle, and none on the rest', async () => {
    await render(<Formats defaultValue="bold" />)
    const hostOf = (name: string) => screen.getByRole('togglebutton', { name }).parent as Drawn
    expect(styleOf(hostOf('Bold')).backgroundColor).toBe(token('color-surface-overlay'))
    expect(styleOf(hostOf('Italic')).backgroundColor).toBeUndefined()
  })
})

describe('what a phone draws of a toggle group', () => {
  test('gives each toggle the row’s height inside the framed track', async () => {
    await render(<Views />)
    const control = Number(token('size-control'))
    const inset = Number(token('space-2xs')) + Number(token('border-thin'))
    expect(styleOf(screen.getByRole('radio', { name: 'List' })).height).toBeCloseTo(
      control - inset * 2,
      3,
    )
  })

  test('takes no wash under a finger, since the indicator is the one surface', async () => {
    await render(<Views />)
    const grid = screen.getByRole('radio', { name: 'Grid' })
    await fireEvent(grid, 'pressIn', { nativeEvent: { pageX: 0, pageY: 0 } })
    expect(styleOf(screen.getByRole('radio', { name: 'Grid' })).backgroundColor).toBe('transparent')
  })

  test('draws its label in the track with a rule after it under `labelPlacement="start"`', async () => {
    await render(<Views labelPlacement="start" />)
    const track = screen.getByText('View').parent?.parent as Drawn
    const rule = (track.children ?? [])[1] as Drawn
    expect(styleOf(rule).backgroundColor).toBe(token('color-border'))
    expect(styleOf(rule).width).toBe(Number(token('border-thin')))
  })

  test('says what is wrong once asked, and rings its track in the danger color', async () => {
    const ref = createRef<FieldHandle>()
    await render(<Views defaultValue="" hint="Pick a view" ref={ref} required />)
    expect(screen.getByText('Pick a view')).toBeTruthy()
    await act(() => void ref.current?.validate())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Choose one to continue.')).toBeTruthy()
    await fireEvent.press(screen.getByRole('radio', { name: 'Grid' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
