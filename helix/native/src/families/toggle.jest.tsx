/*
 * The generated Toggle, drawn from its real intermediate form: a toggle
 * button on its own, announced as one, that asks with `helix-before-toggle`
 * and then turns, in the base layer's look. `test:native` writes the
 * component beside this file, as the styled package's build writes the one it
 * ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import { HelixIcon } from './icon/index.native'
import { HelixToggle, type HelixToggleBeforeToggleEvent } from './toggle/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
/* The parts listening for keys, in the order they started. */
let listening: unknown[] = []

/** Presses `key` on the first part listening for keys, as a hardware keyboard does. */
const pressKey = (key: string) => act(() => void keys.press(listening[0], key))

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      listening.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
  </HelixTheme>
)

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

/** The margin `side` of the nearest view around the glyph `id` that sets one. */
const marginAround = (id: string, side: 'marginEnd' | 'marginStart'): unknown => {
  let at: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId(id, {
    includeHiddenElements: true,
  })
  while (at !== null && styleOf(at)?.[side] === undefined) {
    at = at.parent
  }
  return at === null ? undefined : styleOf(at)[side]
}

/** The toggle button a screen reader reaches, by its name. */
const toggleNamed = (name: string) => screen.getByRole('togglebutton', { name })

/** Whether a screen reader hears the toggle named `name` as pressed. */
const pressed = (name: string): unknown => toggleNamed(name).props.accessibilityState?.checked

describe('a toggle on its own', () => {
  test('is a toggle button named by its words, not pressed', async () => {
    await render(themed(<HelixToggle>Bold</HelixToggle>))
    expect(pressed('Bold')).toBe(false)
  })

  test('starts pressed where `selected` is written', async () => {
    await render(themed(<HelixToggle selected>Bold</HelixToggle>))
    expect(pressed('Bold')).toBe(true)
  })

  test('draws an icon before its words and a count after them, each set off by a step', async () => {
    await render(
      themed(
        <>
          <HelixToggle end={<HelixIcon name="chevron-down" />} start={<HelixIcon name="star" />}>
            Starred
          </HelixToggle>
          <Token name="space-xs" />
        </>,
      ),
    )
    const step = Number(String(screen.getByTestId(/^token space-xs/).props.testID).split(' ')[2])
    expect(marginAround('glyph star', 'marginEnd')).toBe(step)
    expect(marginAround('glyph chevron-down', 'marginStart')).toBe(step)
  })
})

describe('a press on a toggle', () => {
  test('asks with the state it turns to, turns, then tells, and is heard as pressed', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixToggle
          onBeforeToggle={(event) => heard.push(`before ${event.detail.checked}`)}
          onChange={() => heard.push('change')}
        >
          Bold
        </HelixToggle>,
      ),
    )
    await fireEvent.press(toggleNamed('Bold'))
    expect(pressed('Bold')).toBe(true)
    await fireEvent.press(toggleNamed('Bold'))
    expect(pressed('Bold')).toBe(false)
    expect(heard).toEqual(['before true', 'change', 'before false', 'change'])
  })

  test('keeps its state and tells nothing where `helix-before-toggle` is refused', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixToggle
          onBeforeToggle={(event: HelixToggleBeforeToggleEvent) => event.preventDefault()}
          onChange={() => heard.push('change')}
        >
          Bold
        </HelixToggle>,
      ),
    )
    await fireEvent.press(toggleNamed('Bold'))
    expect([pressed('Bold'), heard]).toEqual([false, []])
  })

  test('turns on Enter and on Space, as a button presses', async () => {
    await render(themed(<HelixToggle>Bold</HelixToggle>))
    await pressKey('Enter')
    expect(pressed('Bold')).toBe(true)
    await pressKey(' ')
    expect(pressed('Bold')).toBe(false)
  })

  test('takes a written `selected` with nothing sent, and a press still turns it', async () => {
    const heard: string[] = []
    const onChange = () => heard.push('change')
    const view = await render(themed(<HelixToggle onChange={onChange}>Bold</HelixToggle>))
    await view.rerender(
      themed(
        <HelixToggle onChange={onChange} selected>
          Bold
        </HelixToggle>,
      ),
    )
    expect([pressed('Bold'), heard]).toEqual([true, []])
    await fireEvent.press(toggleNamed('Bold'))
    expect([pressed('Bold'), heard]).toEqual([false, ['change']])
  })
})

describe('a disabled toggle', () => {
  test('says so, takes no press or key, and is drawn at half its opacity', async () => {
    const heard: string[] = []
    await render(
      themed(
        <HelixToggle disabled onBeforeToggle={() => heard.push('before')}>
          Bold
        </HelixToggle>,
      ),
    )
    const toggle = toggleNamed('Bold')
    expect(toggle.props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(toggle)
    await pressKey('Enter')
    expect([pressed('Bold'), heard]).toEqual([false, []])
    expect(styleOf(toggle).opacity).toBe(0.5)
  })
})

describe('what a phone draws of a toggle', () => {
  test('muted words with no ground of their own, and the full foreground while pressed', async () => {
    await render(
      themed(
        <>
          <HelixToggle>Bold</HelixToggle>
          <HelixToggle selected>Italic</HelixToggle>
          <Token name="color-foreground" />
          <Token name="color-foreground-muted" />
        </>,
      ),
    )
    const muted = styleOf(screen.getByText('Bold')).color
    const full = styleOf(screen.getByText('Italic')).color
    expect(screen.getByTestId(`token color-foreground-muted ${muted}`)).toBeTruthy()
    expect(screen.getByTestId(`token color-foreground ${full}`)).toBeTruthy()
    expect(styleOf(toggleNamed('Bold')).backgroundColor).toBe('transparent')
  })

  test('washes its ground and lifts its words while a finger holds it', async () => {
    await render(
      themed(
        <>
          <HelixToggle>Bold</HelixToggle>
          <Token name="color-foreground" />
        </>,
      ),
    )
    await fireEvent(toggleNamed('Bold'), 'pressIn', { nativeEvent: { pageX: 0, pageY: 0 } })
    expect(styleOf(toggleNamed('Bold')).backgroundColor).not.toBe('transparent')
    const color = styleOf(screen.getByText('Bold')).color
    expect(screen.getByTestId(`token color-foreground ${color}`)).toBeTruthy()
  })

  test('takes the full foreground as a press turns it', async () => {
    await render(
      themed(
        <>
          <HelixToggle>Bold</HelixToggle>
          <Token name="color-foreground" />
        </>,
      ),
    )
    await fireEvent.press(toggleNamed('Bold'))
    const color = styleOf(screen.getByText('Bold')).color
    expect(screen.getByTestId(`token color-foreground ${color}`)).toBeTruthy()
  })

  test('draws its words in the small step, beside the small space each side', async () => {
    await render(
      themed(
        <>
          <HelixToggle>Bold</HelixToggle>
          <Token name="text-sm" />
          <Token name="space-sm" />
        </>,
      ),
    )
    const size = styleOf(screen.getByText('Bold')).fontSize
    const side = styleOf(toggleNamed('Bold')).paddingHorizontal
    expect(screen.getByTestId(`token text-sm ${size}`)).toBeTruthy()
    expect(screen.getByTestId(`token space-sm ${side}`)).toBeTruthy()
  })

  test('grows its words with the reader’s text size, and its space stops at 1.353 times', async () => {
    await render(themed(<HelixToggle>Bold</HelixToggle>))
    const words = styleOf(screen.getByText('Bold')).fontSize as number
    const side = styleOf(toggleNamed('Bold')).paddingHorizontal as number
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('Bold')).fontSize).toBeCloseTo(words * 3.571, 1)
    expect(styleOf(toggleNamed('Bold')).paddingHorizontal).toBeCloseTo(side * 1.353, 1)
  })
})
