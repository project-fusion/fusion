/*
 * The generated Checkbox, drawn from its real intermediate form: a row a
 * screen reader hears as a checkbox, checked, unchecked, or mixed, a box
 * whose edge firms as it is ticked, the tick and the dash stroked as the web
 * masks them, Space alone turning it, and the message that takes the hint's
 * place while a required box is empty. `test:native` writes the component
 * beside this file, as the styled package's build writes the one it ships.
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
import { HelixCheckbox, type HelixCheckboxProps } from './checkbox/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The parts listening for keys, in the order they started. */
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
  'color-border',
  'color-danger',
  'color-foreground',
  'color-foreground-subtle',
  'color-primary',
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

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

type Drawn = { props: Record<string, unknown> & { style?: unknown }; children: unknown[] }

/** The checkbox a screen reader reaches. */
const theBox = () => screen.getByRole('checkbox')

/** What a screen reader hears it is: checked, unchecked, or mixed. */
const state = () => theBox().props.accessibilityState?.checked

/** The box's part, which holds the drawn box and the mark. */
const boxPart = () => theBox().children[0] as unknown as Drawn

/** The drawn box: the web's input. */
const control = () => boxPart().children[0] as Drawn

/** The mark over it. */
const mark = () => boxPart().children[1] as Drawn

/** The mark's scale, as its transform says. */
const scale = (): unknown =>
  (styleOf(mark()).transform as readonly Record<string, unknown>[] | undefined)?.find(
    (step) => 'scaleX' in step,
  )?.scaleX

/** A drawn tree, as `toJSON` gives it. */
interface Json {
  readonly children?: readonly (Json | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: string
}

/** Each path in a drawn tree, in order. */
const paths = (tree: Json | readonly Json[] | null = screen.toJSON() as Json | null): Json[] => {
  const nodes = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Json]
  return nodes.flatMap((node) => [
    ...(node.type === 'RNSVGPath' ? [node] : []),
    ...paths(
      (node.children ?? []).filter(
        (child: Json | string): child is Json => typeof child !== 'string',
      ),
    ),
  ])
}

/** The path the mark strokes. */
const path = (): string | undefined => paths()[0]?.props.d as string | undefined

/** Presses `key` on the first part listening for keys. */
const pressKey = (key: string) => act(() => void keys.press(heard[0], key))

const Checkbox = (props: HelixCheckboxProps) => themed(<HelixCheckbox {...props} />)

describe('the generated Checkbox', () => {
  test('is one checkbox named by its words, unchecked, with its mark hidden from screen readers', async () => {
    await render(<Checkbox>Terms</Checkbox>)
    expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeTruthy()
    expect(state()).toBe(false)
    expect(mark().props.importantForAccessibility).toBe('no-hide-descendants')
    expect(scale()).toBe(0)
  })

  test('asks before it turns, then sends input and change, and draws the tick', async () => {
    const told: string[] = []
    await render(
      <Checkbox
        onBeforeCheck={(event) => told.push(`before ${event.detail.checked}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        onInput={() => told.push('input')}
        value="terms"
      >
        Terms
      </Checkbox>,
    )
    /* An empty outline in the mark ink at rest, on whatever the box sits on. */
    expect(styleOf(control()).borderColor).toBe(token('color-foreground-subtle'))
    expect(styleOf(control()).backgroundColor).toBe('transparent')
    await fireEvent.press(theBox())
    expect(state()).toBe(true)
    expect(told).toEqual(['before true', 'input', 'change terms'])
    expect(scale()).toBe(1)
    expect(path()).toBe('M6 12.5 10.2 16.7 18 8.4')
    /* Ticked is an answer, which takes no color: the edge firms to the ink. */
    expect(styleOf(control()).borderColor).toBe(token('color-foreground'))
    await fireEvent.press(theBox())
    expect(state()).toBe(false)
    expect(scale()).toBe(0)
  })

  test('strokes the tick at the weight the web masks it with, in the mark color', async () => {
    await render(<Checkbox defaultChecked>Terms</Checkbox>)
    const stroke = paths()[0]?.props
    expect(stroke?.strokeWidth).toBe(2.5)
    expect(stroke?.fill).toBeNull()
  })

  test('stays as it was and sends nothing more where a handler refuses the turn', async () => {
    const told: string[] = []
    await render(
      <Checkbox
        onBeforeCheck={(event) => event.preventDefault()}
        onChange={() => told.push('change')}
      >
        Terms
      </Checkbox>,
    )
    await fireEvent.press(theBox())
    expect([state(), told]).toEqual([false, []])
  })

  test('turns on Space, and not on Enter, as a native checkbox does', async () => {
    await render(<Checkbox>Terms</Checkbox>)
    await pressKey('Enter')
    expect(state()).toBe(false)
    await pressKey(' ')
    expect(state()).toBe(true)
  })

  test('takes keyboard focus on a press, as a click on its label focuses the web input', async () => {
    await render(<Checkbox>Terms</Checkbox>)
    await fireEvent.press(theBox())
    expect(focus.focused()).toBe(heard[0])
    await pressKey(' ')
    expect(state()).toBe(false)
  })

  test('says it is disabled, takes no press, and is drawn at half opacity', async () => {
    await render(<Checkbox disabled>Terms</Checkbox>)
    expect(theBox().props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(theBox())
    expect([state(), focus.moved]).toEqual([false, []])
    expect(styleOf(screen.root).opacity).toBe(0.5)
  })

  test('takes no press while read-only', async () => {
    const told: string[] = []
    await render(
      <Checkbox defaultChecked onBeforeCheck={() => told.push('before')} readonly>
        Terms
      </Checkbox>,
    )
    await fireEvent.press(theBox())
    expect([state(), told]).toEqual([true, []])
  })

  test('draws an icon passed into `check` in place of the tick', async () => {
    await render(
      <Checkbox check={<View testID="star" />} defaultChecked>
        Terms
      </Checkbox>,
    )
    expect(screen.queryByTestId('star', { includeHiddenElements: true })).toBeTruthy()
    expect(path()).toBeUndefined()
  })

  test('keeps its box at 1.353 times its size at the largest text size, and grows its words', async () => {
    await render(<Checkbox>Terms</Checkbox>)
    const size = styleOf(control()).width as number
    const words = styleOf(screen.getByText('Terms')).fontSize as number
    await act(() => atTextSize(3.571))
    expect(styleOf(control()).width).toBeCloseTo(size * 1.353, 1)
    expect(styleOf(mark()).width).toBeCloseTo(size * 1.353, 1)
    expect(styleOf(screen.getByText('Terms')).fontSize).toBeCloseTo(words * 3.571, 1)
  })
})

describe('a mixed checkbox', () => {
  test('is heard as mixed and draws the dash', async () => {
    await render(<Checkbox indeterminate>Select all</Checkbox>)
    expect(state()).toBe('mixed')
    expect(scale()).toBe(1)
    expect(path()).toBe('M7 12h10')
  })

  /* React Native on Android names a checkbox with no label of its own
     "mixed" while it is mixed, and keeps that name once it is checked. */
  test('carries its words as its label, mixed and then checked, and `ariaLabel` over them', async () => {
    const view = await render(<Checkbox indeterminate>Select all</Checkbox>)
    expect(theBox().props.accessibilityLabel).toBe('Select all')
    await fireEvent.press(theBox())
    expect([theBox().props.accessibilityLabel, state()]).toEqual(['Select all', true])
    await view.rerender(<Checkbox label="Every channel" />)
    expect(theBox().props.accessibilityLabel).toBe('Every channel')
    await view.rerender(
      <Checkbox ariaLabel="Every channel" indeterminate>
        All
      </Checkbox>,
    )
    expect(theBox().props.accessibilityLabel).toBe('Every channel')
  })

  test('resolves to checked on a press, and draws the tick', async () => {
    const told: string[] = []
    await render(
      <Checkbox
        indeterminate
        onBeforeCheck={(event) => told.push(`before ${event.detail.checked}`)}
      >
        Select all
      </Checkbox>,
    )
    await fireEvent.press(theBox())
    expect(state()).toBe(true)
    expect(told).toEqual(['before true'])
    expect(path()).toBe('M6 12.5 10.2 16.7 18 8.4')
  })

  test('resolves to unchecked where it is checked underneath', async () => {
    await render(
      <Checkbox defaultChecked indeterminate>
        Select all
      </Checkbox>,
    )
    await fireEvent.press(theBox())
    expect(state()).toBe(false)
  })

  test('stays mixed where a handler refuses the press', async () => {
    await render(
      <Checkbox indeterminate onBeforeCheck={(event) => event.preventDefault()}>
        Select all
      </Checkbox>,
    )
    await fireEvent.press(theBox())
    expect(state()).toBe('mixed')
    expect(path()).toBe('M7 12h10')
  })
})

describe('a checkbox drawn as a card', () => {
  test('rings the card in the primary color once it is checked', async () => {
    await render(<Checkbox separation="outlined">Backups</Checkbox>)
    const field = theBox()
    expect(styleOf(field).borderColor).toBe(token('color-border'))
    await fireEvent.press(field)
    expect(styleOf(theBox()).borderColor).toBe(token('color-primary'))
    expect(styleOf(theBox()).boxShadow ?? styleOf(theBox()).shadowColor).toBeTruthy()
  })
})

describe('a required checkbox', () => {
  test('says what is wrong in the hint’s place once the reader clears it, and edges the box', async () => {
    await render(
      <Checkbox hint="We keep a copy." required>
        Terms
      </Checkbox>,
    )
    expect(screen.getByText('We keep a copy.')).toBeTruthy()
    await fireEvent.press(theBox())
    expect(screen.queryByRole('alert')).toBeNull()
    await fireEvent.press(theBox())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Tick this box to continue.')).toBeTruthy()
    expect(screen.queryByText('We keep a copy.')).toBeNull()
    expect(styleOf(control()).borderColor).toBe(token('color-danger'))
  })

  test('answers `validate()` on its ref', async () => {
    const ref = createRef<FieldHandle>()
    await render(
      <Checkbox ref={ref} required>
        Terms
      </Checkbox>,
    )
    let answer = true
    await act(() => {
      answer = ref.current?.validate() ?? true
    })
    expect(answer).toBe(false)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('shows the page’s own message at once', async () => {
    await render(<Checkbox feedback="Accept the terms to go on.">Terms</Checkbox>)
    expect(screen.getByText('Accept the terms to go on.')).toBeTruthy()
    expect(styleOf(control()).borderColor).toBe(token('color-danger'))
  })
})
