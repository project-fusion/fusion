/*
 * The generated Steps, drawn from its real intermediate forms: a sequence
 * named by its label whose stages' names are buttons, the current stage and
 * a finished one said in words, a press that goes to a stage, the marks and
 * numbers, the two halves of the line either side of each mark in a row and
 * down a column, and space that stops growing at the largest standard text
 * size while the words grow on. `test:native` writes the components beside
 * this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import {
  HelixStep,
  type HelixStepProps,
  HelixSteps,
  type HelixStepsProps,
} from './steps/index.native'

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

/** Presses `key` on the view that started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** A drawn tree, as `toJSON` gives it. */
interface Json {
  readonly children?: readonly (Json | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
}

/** Each view in a drawn tree, depth first. */
const views = (tree: Json | readonly Json[] | null = screen.toJSON() as Json | null): Json[] => {
  const nodes: readonly Json[] = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Json]
  return nodes.flatMap((node) => [
    node,
    ...views((node.children ?? []).filter((child): child is Json => typeof child !== 'string')),
  ])
}

/** The host each step draws, which holds its two halves of the line first and last. */
const stepHosts = (): Json[] =>
  views().filter((node) => {
    const inside = (node.children ?? []).filter((child): child is Json => typeof child !== 'string')
    return inside.length > 1 && styleOf(inside[0]).position === 'absolute'
  })

/** The half of the line before a step's mark, and the half after it. */
const halves = (
  at: number,
): readonly [Readonly<Record<string, unknown>>, Readonly<Record<string, unknown>>] => {
  const inside = (stepHosts()[at]?.children ?? []) as Json[]
  return [styleOf(inside[0]), styleOf(inside.at(-1))]
}

/** The button a stage's name is, by its words. */
const nameOf = (words: string) => screen.getByRole('button', { name: words })

type Told = { readonly detail: { readonly previous?: string; readonly value: string } }

/** Cart, finished, Shipping, current, and Payment ahead. */
const Checkout = (
  props: HelixStepsProps & { readonly payment?: Partial<HelixStepProps>; readonly told?: string[] },
) => {
  const { payment, told = [], ...rest } = props
  const log = (name: string) => (event: Told) =>
    told.push(`${name} ${event.detail.previous ?? ''}${event.detail.value}`)
  return (
    <HelixTheme Glyph={Recorded} mode="light">
      <HelixSteps
        label="Checkout"
        onActivate={log('activate') as never}
        onBeforeActivate={log('before-activate') as never}
        {...rest}
      >
        <HelixStep complete content="Your cart" value="one">
          Cart
        </HelixStep>
        <HelixStep content="Your address" current value="two">
          Shipping
        </HelixStep>
        <HelixStep content="Your card" onSelect={log('select') as never} value="three" {...payment}>
          Payment
        </HelixStep>
      </HelixSteps>
    </HelixTheme>
  )
}

describe('the generated Steps', () => {
  test('is a list named by its label, whose stages are items with buttons named by their words', async () => {
    await render(<Checkout />)
    const named = views().filter((node) => node.props.accessibilityRole === 'list')
    expect(named.map((node) => node.props.accessibilityLabel)).toEqual(['Checkout'])
    expect(views().filter((node) => node.props.role === 'listitem')).toHaveLength(3)
    for (const words of ['Cart', 'Shipping', 'Payment']) {
      expect(nameOf(words)).toBeTruthy()
    }
  })

  test('says the current stage in words, and a finished one by its `complete-label`', async () => {
    await render(<Checkout />)
    expect(nameOf('Shipping').props.accessibilityValue).toMatchObject({ text: 'Current step' })
    expect(nameOf('Cart').props.accessibilityValue?.text).toBeUndefined()
    expect(nameOf('Cart').props.accessibilityHint).toBe('Complete')
    expect(nameOf('Payment').props.accessibilityHint).toBeUndefined()
  })

  test('marks each stage with a tick, a dot in a ring, or an empty ring', async () => {
    await render(<Checkout />)
    for (const name of ['check', 'record', 'circle']) {
      expect(screen.getAllByTestId(`glyph ${name}`, { includeHiddenElements: true })).toHaveLength(
        1,
      )
    }
    expect(screen.queryAllByTestId('glyph check')).toEqual([])
  })

  test('goes to a stage pressed, asking the stage and then the sequence', async () => {
    const told: string[] = []
    await render(<Checkout told={told} />)
    await fireEvent.press(nameOf('Payment'))
    expect(told).toEqual(['select three', 'before-activate three', 'activate twothree'])
    expect(nameOf('Payment').props.accessibilityValue).toMatchObject({ text: 'Current step' })
    expect(nameOf('Shipping').props.accessibilityValue?.text).toBeUndefined()
    expect(screen.getAllByTestId('glyph record', { includeHiddenElements: true })).toHaveLength(1)
  })

  test('stays where a handler refused the stage’s `select`', async () => {
    const told: string[] = []
    await render(<Checkout payment={{ onSelect: (event) => event.preventDefault() }} told={told} />)
    await fireEvent.press(nameOf('Payment'))
    expect(told).toEqual([])
    expect(nameOf('Shipping').props.accessibilityValue).toMatchObject({ text: 'Current step' })
  })

  test('takes no press on a disabled stage', async () => {
    const told: string[] = []
    await render(<Checkout payment={{ disabled: true }} told={told} />)
    expect(nameOf('Payment').props.accessibilityState).toMatchObject({ disabled: true })
    await fireEvent.press(nameOf('Payment'))
    expect(told).toEqual([])
  })

  test('draws the halves of the line in a row, from half the gap before a step to past its mark', async () => {
    await render(<Checkout />)
    const gap = styleOf(views().find((node) => node.props.accessibilityRole === 'list'))
      .gap as number
    const [firstLead] = halves(0)
    const [lead, trail] = halves(1)
    const [, lastTrail] = halves(2)
    expect(firstLead.display).toBe('none')
    expect(lastTrail.display).toBe('none')
    expect(lead).toMatchObject({ end: '50%', height: 1, position: 'absolute', start: -gap / 2 })
    expect(trail).toMatchObject({ end: -gap / 2, height: 1, position: 'absolute', start: '50%' })
    expect(lead.marginEnd).toBeGreaterThan(0)
    expect(stepHosts().map((host) => styleOf(host).flexDirection)).toEqual([
      'column',
      'column',
      'column',
    ])
  })

  test('runs down a column, the name beside its mark and the current stage open under it', async () => {
    await render(<Checkout orientation="vertical" />)
    const gap = styleOf(views().find((node) => node.props.accessibilityRole === 'list'))
      .gap as number
    const [lead, trail] = halves(1)
    expect(stepHosts().map((host) => styleOf(host).flexDirection)).toEqual(['row', 'row', 'row'])
    expect(lead).toMatchObject({ height: gap / 2, top: -gap / 2, width: 1 })
    expect(trail).toMatchObject({ bottom: -gap / 2, width: 1 })
    expect(screen.queryByText('Your address')).not.toBeNull()
    expect(screen.queryByText('Your cart')).toBeNull()
    expect(screen.queryByText('Your card')).toBeNull()
  })

  test('opens no stage’s content in a row', async () => {
    await render(<Checkout />)
    expect(screen.queryByText('Your address')).toBeNull()
  })

  test('numbers its stages under `numeric`, and draws no mark', async () => {
    await render(<Checkout variant="numeric" />)
    for (const number of ['1', '2', '3']) {
      expect(screen.getByText(number, { includeHiddenElements: true })).toBeTruthy()
    }
    const mark = screen.getByTestId('glyph check', { includeHiddenElements: true }) as unknown as {
      parent: { props: { style?: unknown } }
    }
    expect(styleOf(mark.parent).display).toBe('none')
  })

  test('moves focus among the names with the arrows under `arrows`, going to none, and stops at the ends', async () => {
    const told: string[] = []
    await render(<Checkout arrows told={told} />)
    await pressKey(0, 'ArrowRight')
    expect(heard.indexOf(focus.focused())).toBe(1)
    await pressKey(1, 'End')
    expect(heard.indexOf(focus.focused())).toBe(2)
    await pressKey(2, 'ArrowRight')
    expect(heard.indexOf(focus.focused())).toBe(2)
    await pressKey(2, 'Home')
    expect(heard.indexOf(focus.focused())).toBe(0)
    await pressKey(0, 'ArrowLeft')
    expect(heard.indexOf(focus.focused())).toBe(0)
    expect(told).toEqual([])
  })

  test('leaves Down and Up to the page in a row under `arrows`', async () => {
    await render(<Checkout arrows />)
    await pressKey(0, 'ArrowDown')
    await pressKey(0, 'ArrowUp')
    expect(focus.moved.length).toBe(0)
  })

  test('moves focus with Down and Up in a column under `arrows`, and leaves Left and Right to the page', async () => {
    await render(<Checkout arrows orientation="vertical" />)
    await pressKey(0, 'ArrowDown')
    expect(heard.indexOf(focus.focused())).toBe(1)
    await pressKey(1, 'ArrowUp')
    expect(heard.indexOf(focus.focused())).toBe(0)
    const moves = focus.moved.length
    await pressKey(0, 'ArrowRight')
    await pressKey(0, 'ArrowLeft')
    expect(focus.moved.length).toBe(moves)
  })

  test('leaves the arrows alone without `arrows`', async () => {
    await render(<Checkout />)
    await pressKey(0, 'ArrowRight')
    expect(focus.moved.length).toBe(0)
  })

  test('grows the names fully with the text size, and stops the marks at 1.353 times', async () => {
    await render(<Checkout />)
    const words = styleOf(screen.getByText('Payment')).fontSize as number
    const glyph = () =>
      styleOf(screen.getByTestId('glyph circle', { includeHiddenElements: true })).height as number
    const mark = glyph()
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('Payment')).fontSize as number).toBeCloseTo(words * 3.571, 1)
    expect(glyph()).toBeCloseTo(mark * 1.353, 1)
  })
})
