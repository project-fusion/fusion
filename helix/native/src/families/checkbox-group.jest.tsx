/*
 * The generated Checkbox Group, drawn from its real intermediate form with
 * the generated Checkbox: a group a screen reader hears by its name, boxes
 * that each turn on their own and ask the group first, the value the group
 * reads from them, the box that turns every one, and the message a required
 * group shows while nothing is checked. `test:native` writes the components
 * beside this file, as the styled package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Dimensions, View } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixCheckbox } from './checkbox/index.native'
import { HelixCheckboxGroup, type HelixCheckboxGroupProps } from './checkbox-group/index.native'
import { type Drawn, nodes, styleOf } from './drawn'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
/* The parts listening for keys, in the order they started: each box's press. */
let heard: unknown[] = []

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
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

const TOKENS = ['color-border', 'color-danger', 'space-md', 'space-xs']

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

/** The checkbox a screen reader reaches by its words. */
const box = (name: string) => screen.getByRole('checkbox', { name })

/** What a screen reader hears the box named by its words is: checked, unchecked, or mixed. */
const checked = (name: string): unknown => box(name).props.accessibilityState?.checked

/** Presses `key` on the box whose press started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** Three channels, the last disabled where `last` is off. */
const Channels = (
  props: HelixCheckboxGroupProps & { readonly last?: boolean; readonly third?: boolean },
) =>
  themed(
    <HelixCheckboxGroup label="Notify me" {...props}>
      <HelixCheckbox value="email">Email</HelixCheckbox>
      <HelixCheckbox value="text">Text</HelixCheckbox>
      <HelixCheckbox
        defaultChecked={props.third === true}
        disabled={props.last === false}
        value="push"
      >
        Push
      </HelixCheckbox>
    </HelixCheckboxGroup>,
  )

/** The view the boxes are laid out in: the group a screen reader reaches. */
const items = (): Drawn => {
  const found = nodes(screen.toJSON()).find((node) => node.props.role === 'group')
  if (found === undefined) {
    throw new Error('no group is drawn')
  }
  return found
}

describe('the generated Checkbox Group', () => {
  test('is a group named by its label, and each box a checkbox of its own', async () => {
    await render(<Channels />)
    expect(items().props.accessibilityLabel).toBe('Notify me')
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([false, false, false])
  })

  test('checks the boxes its value names, and only those', async () => {
    await render(<Channels value="text,push" />)
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([false, true, true])
  })

  test('asks the box, then the group with the whole set, then tells the group’s change before the box’s', async () => {
    const told: string[] = []
    await render(
      themed(
        <HelixCheckboxGroup
          label="Notify me"
          onBeforeChange={(event) => told.push(`group before-change ${event.detail.value}`)}
          onChange={(event) => told.push(`group change ${event.target.value}`)}
          onInput={() => told.push('group input')}
        >
          <HelixCheckbox defaultChecked value="email">
            Email
          </HelixCheckbox>
          <HelixCheckbox
            onBeforeToggle={(event) => told.push(`box before-toggle ${event.detail.checked}`)}
            onChange={() => told.push('box change')}
            value="text"
          >
            Text
          </HelixCheckbox>
        </HelixCheckboxGroup>,
      ),
    )
    await fireEvent.press(box('Text'))
    expect(checked('Text')).toBe(true)
    expect(told).toEqual([
      'box before-toggle true',
      'group before-change email,text',
      'group input',
      'group change email,text',
      'box change',
    ])
  })

  test('keeps the box as it was where the group refuses the change', async () => {
    const told: string[] = []
    await render(
      <Channels
        onBeforeChange={(event) => event.preventDefault()}
        onChange={() => told.push('change')}
      />,
    )
    await fireEvent.press(box('Email'))
    expect([checked('Email'), told]).toEqual([false, []])
  })

  test('asks nothing of the group where the box refuses its own turn', async () => {
    const told: string[] = []
    await render(
      themed(
        <HelixCheckboxGroup label="Notify me" onBeforeChange={() => told.push('before-change')}>
          <HelixCheckbox onBeforeToggle={(event) => event.preventDefault()} value="email">
            Email
          </HelixCheckbox>
        </HelixCheckboxGroup>,
      ),
    )
    await fireEvent.press(box('Email'))
    expect([checked('Email'), told]).toEqual([false, []])
  })

  test('holds its boxes by box, so boxes that share a value turn one at a time', async () => {
    const told: string[] = []
    await render(
      themed(
        <HelixCheckboxGroup label="Agree" onChange={(event) => told.push(event.target.value)}>
          <HelixCheckbox>Terms</HelixCheckbox>
          <HelixCheckbox>Privacy</HelixCheckbox>
        </HelixCheckboxGroup>,
      ),
    )
    await fireEvent.press(box('Terms'))
    expect([checked('Terms'), checked('Privacy'), told]).toEqual([true, false, ['on']])
  })

  test('turns the box with focus on Space, as a native checkbox takes it', async () => {
    await render(<Channels />)
    await pressKey(1, ' ')
    expect(checked('Text')).toBe(true)
  })

  test('disables every box while it is disabled, and gives each its own state back after', async () => {
    const view = await render(<Channels disabled />)
    for (const name of ['Email', 'Text', 'Push']) {
      expect(box(name).props.accessibilityState).toMatchObject({ disabled: true })
    }
    await fireEvent.press(box('Email'))
    expect(checked('Email')).toBe(false)
    await view.rerender(<Channels />)
    expect(box('Email').props.accessibilityState?.disabled).toBe(false)
  })
})

describe('the box that checks every box', () => {
  test('is drawn under `selectAll`, checked, mixed, or clear as the boxes are', async () => {
    const view = await render(<Channels selectAll />)
    expect(checked('Select all')).toBe(false)
    await fireEvent.press(box('Email'))
    expect(checked('Select all')).toBe('mixed')
    await view.rerender(<Channels selectAll value="email,text,push" />)
    expect(checked('Select all')).toBe(true)
  })

  test('checks every enabled box, then clears them all, each through one change', async () => {
    const told: string[] = []
    await render(<Channels onChange={(event) => told.push(event.target.value)} selectAll />)
    await fireEvent.press(box('Select all'))
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([true, true, true])
    await fireEvent.press(box('Select all'))
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([false, false, false])
    expect(told).toEqual(['email,text,push', ''])
  })

  test('leaves a disabled box as it is, both ways round', async () => {
    await render(<Channels last={false} selectAll third />)
    await fireEvent.press(box('Select all'))
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([true, true, true])
    await fireEvent.press(box('Select all'))
    expect([checked('Email'), checked('Text'), checked('Push')]).toEqual([false, false, true])
  })

  /* React Native on Android names a checkbox with no label of its own
     "mixed" while it is mixed, and keeps that name once it is checked: run
     38957410938 found the select-all box so on an emulator. */
  test('carries its words as its label, mixed, checked, or clear', async () => {
    const label = () =>
      screen
        .getAllByRole('checkbox')
        .map((one) => one.props.accessibilityLabel)
        .at(0)
    const view = await render(<Channels selectAll value="email" />)
    expect([label(), checked('Select all')]).toEqual(['Select all', 'mixed'])
    await view.rerender(<Channels selectAll value="email,text,push" />)
    expect([label(), checked('Select all')]).toEqual(['Select all', true])
    await view.rerender(<Channels selectAll value="" />)
    expect([label(), checked('Select all')]).toEqual(['Select all', false])
  })

  test('takes its words from `selectAllLabel`', async () => {
    await render(<Channels selectAll selectAllLabel="Every channel" />)
    expect(box('Every channel')).toBeTruthy()
  })
})

describe('what a phone draws of a checkbox group', () => {
  test('lays its boxes in a column a step apart, and in a row under `orientation="horizontal"`', async () => {
    const view = await render(<Channels />)
    expect(styleOf(items())).toMatchObject({
      flexDirection: 'column',
      gap: Number(token('space-xs')),
    })
    await view.rerender(<Channels orientation="horizontal" />)
    expect(styleOf(items())).toMatchObject({
      columnGap: Number(token('space-md')),
      flexDirection: 'row',
      flexWrap: 'wrap',
    })
  })

  test('says what is wrong once asked, and edges each box in the danger color', async () => {
    const ref = createRef<FieldHandle>()
    await render(<Channels hint="Pick any" ref={ref} required />)
    expect(screen.getByText('Pick any')).toBeTruthy()
    await act(() => void ref.current?.validate())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Choose at least one to continue.')).toBeTruthy()
    const control = (box('Email').children[0] as unknown as Drawn).children?.[0] as Drawn
    expect(styleOf(control).borderColor).toBe(token('color-danger'))
    await fireEvent.press(box('Email'))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
