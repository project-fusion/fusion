/*
 * The generated Switch, drawn from its real intermediate form: a row a screen
 * reader hears as a switch, a track that fills and a thumb that travels as it
 * turns, Space alone turning it, and the message that takes the hint's place
 * while a required switch is off. `test:native` writes the component beside
 * this file, as the styled package's build writes the one it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixSwitch, type HelixSwitchProps } from './switch/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
/* The parts listening for keys, in the order they started. */
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

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Token name="color-primary-surface" />
    <Token name="color-surface-sunken" />
    <Token name="color-danger" />
  </HelixTheme>
)

/** A token's value, as the theme drew it. */
const token = (name: string): string => {
  const found = screen.getAllByTestId(new RegExp(`^token ${name} `))[0]
  return String(found?.props.testID).slice(`token ${name} `.length)
}

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The switch a screen reader reaches. */
const theSwitch = () => screen.getByRole('switch')

/** Whether a screen reader hears it on. */
const on = () => theSwitch().props.accessibilityState?.checked

/** The track: the first view inside the row. */
const track = () =>
  theSwitch().children[0] as unknown as { props: { style?: unknown }; children: unknown[] }

/** The thumb: the view inside the track. */
const thumb = () => track().children[0] as { props: { style?: unknown } }

/** How far the thumb has moved along the track. */
const travel = (): unknown =>
  (styleOf(thumb()).transform as readonly Record<string, unknown>[] | undefined)?.find(
    (step) => 'translateX' in step,
  )?.translateX

/** Presses `key` on the first part listening for keys. */
const pressKey = (key: string) => act(() => void keys.press(heard[0], key))

const Switch = (props: HelixSwitchProps) => themed(<HelixSwitch {...props} />)

describe('the generated Switch', () => {
  test('is one switch named by its words, off, with the thumb hidden from screen readers', async () => {
    await render(<Switch>Email notifications</Switch>)
    expect(screen.getByRole('switch', { name: 'Email notifications' })).toBeTruthy()
    expect(on()).toBe(false)
    expect((thumb().props as Record<string, unknown>).importantForAccessibility).toBe(
      'no-hide-descendants',
    )
  })

  test('is named by `label`, and by `ariaLabel` where it shows no words', async () => {
    const view = await render(<Switch label="Wi-Fi" />)
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toBeTruthy()
    await view.rerender(<Switch ariaLabel="Bluetooth" />)
    expect(screen.getByRole('switch', { name: 'Bluetooth' })).toBeTruthy()
  })

  test('asks before it turns, then sends input and change, and fills the track as it goes on', async () => {
    const told: string[] = []
    await render(
      <Switch
        onBeforeCheck={(event) => told.push(`before ${event.detail.checked}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        onInput={() => told.push('input')}
        value="email"
      >
        Email
      </Switch>,
    )
    const rest = styleOf(track()).backgroundColor
    expect(rest).toBe(token('color-surface-sunken'))
    expect(travel()).toBe(0)
    await fireEvent.press(theSwitch())
    expect(on()).toBe(true)
    expect(told).toEqual(['before true', 'input', 'change email'])
    expect(styleOf(track()).backgroundColor).toBe(token('color-primary-surface'))
    /* The track less the thumb and the gap at both ends: 42 less 24. */
    const { height, width } = styleOf(track()) as { height: number; width: number }
    expect(travel()).toBe(width - height)
    await fireEvent.press(theSwitch())
    expect(on()).toBe(false)
    expect(styleOf(track()).backgroundColor).toBe(rest)
  })

  test('stays as it was and sends nothing more where a handler refuses the turn', async () => {
    const told: string[] = []
    await render(
      <Switch
        onBeforeCheck={(event) => event.preventDefault()}
        onChange={() => told.push('change')}
      >
        Email
      </Switch>,
    )
    await fireEvent.press(theSwitch())
    expect([on(), told]).toEqual([false, []])
  })

  test('turns on Space, and not on Enter, as a native checkbox does', async () => {
    await render(<Switch>Email</Switch>)
    await pressKey('Enter')
    expect(on()).toBe(false)
    await pressKey(' ')
    expect(on()).toBe(true)
  })

  test('starts on where `defaultChecked` says, and takes a written `checked`', async () => {
    const view = await render(<Switch defaultChecked>Email</Switch>)
    expect(on()).toBe(true)
    await view.rerender(<Switch checked={false}>Email</Switch>)
    expect(on()).toBe(false)
  })

  test('says it is disabled, takes no press, and is drawn at half opacity', async () => {
    await render(<Switch disabled>Email</Switch>)
    expect(theSwitch().props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(theSwitch())
    expect(on()).toBe(false)
    expect(styleOf(screen.root).opacity).toBe(0.5)
  })

  test('takes no press while read-only, and still says where it is', async () => {
    const told: string[] = []
    await render(
      <Switch defaultChecked onBeforeCheck={() => told.push('before')} readonly>
        Email
      </Switch>,
    )
    await fireEvent.press(theSwitch())
    expect([on(), told]).toEqual([true, []])
  })

  test('draws the icon for the state it is in, on the thumb', async () => {
    await render(
      <Switch off={<View testID="moon" />} on={<View testID="sun" />}>
        Dark mode
      </Switch>,
    )
    expect(screen.queryByTestId('moon', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.queryByTestId('sun', { includeHiddenElements: true })).toBeNull()
    await fireEvent.press(theSwitch())
    expect(screen.queryByTestId('sun', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.queryByTestId('moon', { includeHiddenElements: true })).toBeNull()
  })

  test('keeps its track and thumb at 1.353 times their size at the largest text size, and grows its words', async () => {
    await render(<Switch>Email</Switch>)
    const height = styleOf(track()).height as number
    const width = styleOf(track()).width as number
    const words = styleOf(screen.getByText('Email')).fontSize as number
    await act(() => atTextSize(3.571))
    /* Above 1.353 a control's height is the least it can be. */
    expect(styleOf(track()).minHeight).toBeCloseTo(height * 1.353, 1)
    expect(styleOf(track()).width).toBeCloseTo(width * 1.353, 1)
    expect(styleOf(screen.getByText('Email')).fontSize).toBeCloseTo(words * 3.571, 1)
  })
})

describe('a required switch', () => {
  test('shows its hint while nothing is wrong', async () => {
    await render(
      <Switch hint="Needed for receipts" required>
        Email
      </Switch>,
    )
    expect(screen.getByText('Needed for receipts')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('says what is wrong in the hint’s place once the reader turns it off, and edges the track', async () => {
    await render(
      <Switch hint="Needed for receipts" required>
        Email
      </Switch>,
    )
    await fireEvent.press(theSwitch())
    expect(screen.queryByRole('alert')).toBeNull()
    await fireEvent.press(theSwitch())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Turn this on to continue.')).toBeTruthy()
    expect(screen.queryByText('Needed for receipts')).toBeNull()
    expect(styleOf(track()).borderColor).toBe(token('color-danger'))
    await fireEvent.press(theSwitch())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('says its own sentence where the page wrote one', async () => {
    await render(
      <Switch required valueMissingMessage="Turn on email to get receipts.">
        Email
      </Switch>,
    )
    await fireEvent.press(theSwitch())
    await fireEvent.press(theSwitch())
    expect(screen.getByText('Turn on email to get receipts.')).toBeTruthy()
  })

  test('answers `validate()` on its ref, and shows the message from then on', async () => {
    const ref = createRef<FieldHandle>()
    await render(
      <Switch ref={ref} required>
        Email
      </Switch>,
    )
    expect(screen.queryByRole('alert')).toBeNull()
    let answer = true
    await act(() => {
      answer = ref.current?.validate() ?? true
    })
    expect(answer).toBe(false)
    expect(screen.getByText('Turn this on to continue.')).toBeTruthy()
    await fireEvent.press(theSwitch())
    await act(() => {
      answer = ref.current?.validate() ?? false
    })
    expect(answer).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('shows the page’s own message at once', async () => {
    await render(<Switch feedback="Email is off for this account.">Email</Switch>)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Email is off for this account.')).toBeTruthy()
    expect(styleOf(track()).borderColor).toBe(token('color-danger'))
  })
})
