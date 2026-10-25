/*
 * The generated Radio and Radio Group, drawn from their real intermediate
 * forms: a set a screen reader hears as a radio group, each radio checked
 * while it is the answer, a press and the arrow keys moving the answer with
 * the group asking first, a dot that scales in, and the message a required
 * group shows while nothing is chosen. `test:native` writes the components
 * beside this file, as the styled package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixRadio, HelixRadioGroup, type HelixRadioGroupProps } from './radio/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The parts listening for keys, in the order they started: each radio's press. */
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

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Token name="color-danger" />
    <Token name="color-foreground" />
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

type Drawn = { props: Record<string, unknown> & { style?: unknown }; children: unknown[] }

/** The radio a screen reader reaches by its words. */
const radio = (name: string) => screen.getByRole('radio', { name })

/** Whether a screen reader hears the radio checked. */
const checked = (name: string) => radio(name).props.accessibilityState?.checked

/** A drawn tree, as `toJSON` gives it. */
interface Json {
  readonly children?: readonly (Json | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: string
}

/** Each view in a drawn tree with this role, in order. */
const withRole = (
  role: string,
  tree: Json | readonly Json[] | null = screen.toJSON() as Json | null,
): Json[] => {
  const nodes = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Json]
  return nodes.flatMap((node) => [
    ...(node.props.accessibilityRole === role ? [node] : []),
    ...withRole(
      role,
      (node.children ?? []).filter(
        (child: Json | string): child is Json => typeof child !== 'string',
      ),
    ),
  ])
}

/** A radio's circle. */
const circle = (name: string) => radio(name).children[0] as unknown as Drawn

/** The dot's scale, as its transform says. */
const dot = (name: string): unknown =>
  (
    styleOf(circle(name).children[0] as Drawn).transform as
      | readonly Record<string, unknown>[]
      | undefined
  )?.find((step) => 'scaleX' in step)?.scaleX

/** Presses `key` on the radio whose press started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** Three plans, the middle one chosen to begin with. */
const Plans = (props: HelixRadioGroupProps & { readonly middle?: boolean }) =>
  themed(
    <HelixRadioGroup defaultValue="team" label="Plan" {...props}>
      <HelixRadio value="solo">Solo</HelixRadio>
      <HelixRadio disabled={props.middle === false} value="team">
        Team
      </HelixRadio>
      <HelixRadio value="company">Company</HelixRadio>
    </HelixRadioGroup>,
  )

describe('the generated Radio Group', () => {
  test('is a radio group named by its label, and each radio is a radio checked while it is the answer', async () => {
    await render(<Plans />)
    /* A container a reader moves through, so it is no element of its own. */
    expect(withRole('radiogroup').map((node) => node.props.accessibilityLabel)).toEqual(['Plan'])
    expect([checked('Solo'), checked('Team'), checked('Company')]).toEqual([false, true, false])
    expect(circle('Team').props.importantForAccessibility).toBe('no-hide-descendants')
  })

  test('chooses nothing until a reader answers, or opens on the radio written `selected`', async () => {
    const view = await render(<Plans defaultValue="" />)
    expect([checked('Solo'), checked('Team'), checked('Company')]).toEqual([false, false, false])
    await view.unmount()
    await render(
      themed(
        <HelixRadioGroup label="Plan">
          <HelixRadio value="solo">Solo</HelixRadio>
          <HelixRadio selected value="team">
            Team
          </HelixRadio>
        </HelixRadioGroup>,
      ),
    )
    expect([checked('Solo'), checked('Team')]).toEqual([false, true])
  })

  test('moves the answer on a press, asking the radio, then the group, then telling', async () => {
    const told: string[] = []
    await render(
      <Plans
        onBeforeChange={(event) => told.push(`before-change ${event.detail.value}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        onInput={() => told.push('input')}
        onSelect={(event) => told.push(`select ${event.detail.value}`)}
      />,
    )
    await fireEvent.press(radio('Company'))
    expect([checked('Team'), checked('Company')]).toEqual([false, true])
    expect(told).toEqual(['select company', 'before-change company', 'input', 'change company'])
  })

  test('draws the chosen radio’s dot and firms its circle to the ink', async () => {
    await render(<Plans />)
    expect([dot('Solo'), dot('Team')]).toEqual([0, 1])
    expect(styleOf(circle('Team')).borderColor).toBe(token('color-foreground'))
  })

  test('keeps the answer where the group refuses the change, or the radio its choice', async () => {
    const view = await render(<Plans onBeforeChange={(event) => event.preventDefault()} />)
    await fireEvent.press(radio('Solo'))
    expect(checked('Team')).toBe(true)
    await view.rerender(<Plans onSelect={(event) => event.preventDefault()} />)
    await fireEvent.press(radio('Solo'))
    expect(checked('Team')).toBe(true)
  })

  test('chooses the next radio with the arrows, comes round from the last, and passes over a disabled one', async () => {
    await render(<Plans defaultValue="solo" middle={false} />)
    await pressKey(0, 'ArrowRight')
    expect(checked('Company')).toBe(true)
    await pressKey(2, 'ArrowDown')
    expect(checked('Solo')).toBe(true)
    await pressKey(0, 'End')
    expect(checked('Company')).toBe(true)
  })

  test('moves nothing on a typed letter, as the web group has no letters', async () => {
    await render(<Plans />)
    await pressKey(1, 'c')
    expect(checked('Team')).toBe(true)
  })

  test('refuses a press and moves focus alone with the arrows while read-only', async () => {
    const told: string[] = []
    await render(<Plans onChange={() => told.push('change')} readonly />)
    await fireEvent.press(radio('Solo'))
    expect(checked('Team')).toBe(true)
    await pressKey(1, 'ArrowRight')
    expect(checked('Team')).toBe(true)
    expect(focus.focused()).toBe(heard[2])
    expect(told).toEqual([])
  })

  test('disables every radio while it is disabled', async () => {
    await render(<Plans disabled />)
    for (const name of ['Solo', 'Team', 'Company']) {
      expect(radio(name).props.accessibilityState).toMatchObject({ disabled: true })
    }
    await fireEvent.press(radio('Solo'))
    expect(checked('Team')).toBe(true)
  })

  test('keeps its circles at 1.353 times their size at the largest text size, and grows its words', async () => {
    await render(<Plans />)
    const size = styleOf(circle('Team')).width as number
    const words = styleOf(screen.getByText('Team')).fontSize as number
    await act(() => atTextSize(3.571))
    expect(styleOf(circle('Team')).width).toBeCloseTo(size * 1.353, 1)
    expect(styleOf(screen.getByText('Team')).fontSize).toBeCloseTo(words * 3.571, 1)
  })
})

describe('a required radio group', () => {
  test('says what is wrong once asked, and edges each circle in the danger color', async () => {
    const ref = createRef<FieldHandle>()
    await render(<Plans defaultValue="" hint="Pick one" ref={ref} required />)
    expect(screen.getByText('Pick one')).toBeTruthy()
    let verdict = true
    await act(() => {
      verdict = ref.current?.validate() ?? true
    })
    expect(verdict).toBe(false)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Choose one to continue.')).toBeTruthy()
    expect(screen.queryByText('Pick one')).toBeNull()
    expect(styleOf(circle('Solo')).borderColor).toBe(token('color-danger'))
    await fireEvent.press(radio('Solo'))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('a radio drawn as a chip', () => {
  test('is named by its words while they take no room', async () => {
    await render(
      themed(
        <HelixRadioGroup defaultValue="1" label="Rating">
          <HelixRadio value="1" variant="chip">
            One star
          </HelixRadio>
        </HelixRadioGroup>,
      ),
    )
    expect(radio('One star')).toBeTruthy()
    const words = screen.getByText('One star').parent as unknown as Drawn
    expect(styleOf(words)).toMatchObject({ height: 1, overflow: 'hidden', position: 'absolute' })
  })
})
