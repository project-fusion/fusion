/*
 * The generated Kbd, drawn from its real intermediate form: a key drawn as a
 * physical key in the line of words, announced as a keyboard key, and a
 * chord in the reader's keyboard's glyphs, said in words. `test:native`
 * writes the component beside this file, as the styled package's build
 * writes the one it ships.
 */
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixKbd } from './kbd/index.native'

const original: Environment = environment()

afterEach(() => {
  setEnvironment(original)
})

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** The key: the view announced as a keyboard key. */
const key = (): Drawn => {
  const found = nodes(screen.toJSON()).find(
    (node) => node.props.accessibilityRole === 'keyboardkey',
  )
  if (found === undefined) {
    throw new Error('no key')
  }
  return found
}

/** The innermost text that holds `words`. */
const textOf = (words: string): Drawn => {
  const found = nodes(screen.toJSON())
    .filter((node) => node.type === 'Text' && wordsOf(node).includes(words))
    .at(-1)
  if (found === undefined) {
    throw new Error(`no text holds ${words}`)
  }
  return found
}

describe('the generated Kbd', () => {
  test('is a key announced as a keyboard key, holding its label', async () => {
    await render(themed(<HelixKbd>Esc</HelixKbd>))
    expect(key().type).toBe('View')
    expect(wordsOf(key())).toBe('Esc')
  })

  test('is drawn as a physical key: a sunken fill, a hairline border, and rounded corners', async () => {
    await render(themed(<HelixKbd>K</HelixKbd>))
    const box = styleOf(key())
    expect(box.backgroundColor).toBe(light['color-surface-sunken'])
    expect(box.borderColor).toBe(light['color-border'])
    expect(box.borderWidth).toBe(1)
    expect(box.borderRadius).toBeGreaterThan(0)
    expect(box.minWidth).toBe(box.height)
  })

  test('sets its label in the mono face, on one line, with no ligatures', async () => {
    await render(themed(<HelixKbd>{'=>'}</HelixKbd>))
    const label = textOf('=>')
    expect(styleOf(label).fontFamily).toBe('ui-monospace')
    expect(String(styleOf(label).fontVariant)).toContain('no-common-ligatures')
    expect(String(styleOf(label).fontVariant)).toContain('no-contextual')
    expect(label.props.numberOfLines).toBe(1)
  })

  test('sits in a line of words as a box of its own', async () => {
    await render(
      themed(
        <Text>
          Press <HelixKbd>K</HelixKbd> to search.
        </Text>,
      ),
    )
    const [outer] = nodes(screen.toJSON())
    expect(outer?.type).toBe('Text')
    expect(wordsOf(outer as Drawn)).toBe('Press K to search.')
    expect(key().type).toBe('View')
  })
})

describe('a chord `keys` names', () => {
  test('is drawn in Apple glyphs on an iPhone and an iPad, and said in words', async () => {
    setEnvironment(fakeEnvironment({ platform: 'ios' }))
    await render(themed(<HelixKbd keys="mod+shift+p" />))
    expect(wordsOf(key())).toBe('⇧⌘P')
    expect(textOf('⇧⌘P').props.accessibilityLabel).toBe('Shift Command P')
  })

  test('is drawn with Ctrl and a plus elsewhere', async () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    await render(themed(<HelixKbd keys="mod+k" />))
    expect(wordsOf(key())).toBe('Ctrl+K')
  })

  test('takes the names `keyLabels` gives the keys', async () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    await render(themed(<HelixKbd keyLabels='{"mod":"Command"}' keys="mod+k" />))
    expect(wordsOf(key())).toBe('Command+K')
  })

  test('draws no chord where `keys` is empty', async () => {
    await render(themed(<HelixKbd>Tab</HelixKbd>))
    expect(wordsOf(key())).toBe('Tab')
  })
})

describe('a chord drawn under `caps`', () => {
  /** Every key a chord draws: the views drawn as a cap, in order. */
  const caps = (): Drawn[] =>
    nodes(screen.toJSON()).filter(
      (node) =>
        node.type === 'View' &&
        node.props.accessibilityRole !== 'keyboardkey' &&
        styleOf(node).borderWidth === 1,
    )

  test('is a cap per key, as the web draws a key part per key', async () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    await render(themed(<HelixKbd caps keys="mod+shift+p" />))
    expect(caps().map(wordsOf)).toEqual(['Ctrl', 'Shift', 'P'])
    expect(styleOf(key()).borderWidth ?? 0).toBe(0)
  })

  test('draws the platform’s separator between two keys and hides it from screen readers', async () => {
    setEnvironment(fakeEnvironment({ platform: 'android' }))
    await render(themed(<HelixKbd caps keys="mod+k" />))
    const plus = textOf('+')
    expect(plus.props.accessibilityElementsHidden).toBe(true)
    expect(wordsOf(key())).toBe('Ctrl+K')
  })

  test('says each key in words where it is drawn in a glyph, with no separator between glyphs', async () => {
    setEnvironment(fakeEnvironment({ platform: 'ios' }))
    await render(themed(<HelixKbd caps keys="mod+k" />))
    expect(wordsOf(key())).toBe('⌘K')
    expect(textOf('⌘').props.accessibilityLabel).toBe('Command')
  })

  test('says the whole chord as one element, as the web does', async () => {
    setEnvironment(fakeEnvironment({ platform: 'ios' }))
    await render(themed(<HelixKbd caps keys="mod+shift+p" />))
    expect(key().props.accessible).toBe(true)
    /* In an Apple keyboard's order, Shift before Command. */
    expect(key().props.accessibilityLabel).toBe('Shift Command P')
  })

  test('a key with no chord is read by what it holds', async () => {
    await render(themed(<HelixKbd>Esc</HelixKbd>))
    expect(key().props.accessibilityLabel).toBeUndefined()
  })
})
