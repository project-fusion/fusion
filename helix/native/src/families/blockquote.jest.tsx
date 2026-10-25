/*
 * The generated Blockquote, drawn from its real intermediate form: a figure
 * holding the passage in the display face and the attribution under it,
 * the attribution drawn only while it has words, and under `marks` one large
 * opening mark over the passage in the element's language. `test:native`
 * writes the component beside this file, as the styled package's build
 * writes the one it ships.
 */
import { describe, expect, test } from '@jest/globals'
import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { HelixBlockquote } from './blockquote/index.native'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixQuote } from './quote/index.native'

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

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

/** A token's size in points at the default text size, where a rem is 16. */
const points = (name: keyof typeof light): number => Number.parseFloat(String(light[name])) * 16

const PASSAGE = 'Weekly reports now take a few minutes.'

describe('the generated Blockquote', () => {
  test('is a figure holding the passage and its attribution, in that order', async () => {
    await render(themed(<HelixBlockquote attribution="Maria Lopez">{PASSAGE}</HelixBlockquote>))
    const figure = nodes(screen.toJSON()).find((node) => node.props.role === 'figure')
    expect(figure).toBeDefined()
    expect(wordsOf(figure as Drawn)).toBe(`${PASSAGE}Maria Lopez`)
  })

  test('sets the passage in the display face, larger and quieter than body text', async () => {
    await render(themed(<HelixBlockquote>{PASSAGE}</HelixBlockquote>))
    expect(styleOf(textOf(PASSAGE))).toMatchObject({
      color: light['color-foreground-muted'],
      fontSize: points('text-xl'),
      fontWeight: String(light['weight-medium']),
    })
  })

  test('sets the attribution smaller, with room above it', async () => {
    await render(themed(<HelixBlockquote attribution="Maria Lopez">{PASSAGE}</HelixBlockquote>))
    expect(styleOf(textOf('Maria Lopez')).fontSize).toBeCloseTo(points('text-sm'), 1)
    const caption = nodes(screen.toJSON())
      .filter((node) => node.type === 'View' && wordsOf(node) === 'Maria Lopez')
      .at(0)
    expect(styleOf(caption as Drawn).marginTop).toBeGreaterThan(0)
  })

  test('an attribution passed in replaces the words', async () => {
    await render(
      themed(
        <HelixBlockquote attribution={<Text>A linked source</Text>}>{PASSAGE}</HelixBlockquote>,
      ),
    )
    expect(screen.getByText('A linked source')).toBeTruthy()
    expect(nodes(screen.toJSON()).some((node) => styleOf(node).display === 'none')).toBe(false)
  })

  test('draws no attribution, and no room for one, where nothing said it', async () => {
    await render(themed(<HelixBlockquote>{PASSAGE}</HelixBlockquote>))
    const hidden = nodes(screen.toJSON()).filter(
      (node) => node.type === 'View' && styleOf(node).display === 'none',
    )
    expect(hidden).toHaveLength(1)
    expect(wordsOf(hidden[0] as Drawn)).toBe('')
  })
})

describe('the mark `marks` draws', () => {
  test('is one large opening mark over the passage, drawn and not read', async () => {
    await render(themed(<HelixBlockquote marks>{PASSAGE}</HelixBlockquote>))
    const mark = textOf('“')
    expect(wordsOf(mark)).toBe('“')
    expect(styleOf(mark)).toMatchObject({
      color: light['color-foreground-subtle'],
      fontSize: points('text-3xl'),
    })
    expect(isHiddenFromAccessibility(screen.getByText('“', { includeHiddenElements: true }))).toBe(
      true,
    )
  })

  test('is the mark of the element’s language', async () => {
    await render(
      themed(
        <HelixBlockquote lang="de" marks>
          {PASSAGE}
        </HelixBlockquote>,
      ),
    )
    expect(wordsOf(textOf('„'))).toBe('„')
  })

  test('puts a quotation in the passage one level deeper', async () => {
    await render(
      themed(
        <HelixBlockquote marks>
          <Text>
            She said <HelixQuote>soon</HelixQuote>.
          </Text>
        </HelixBlockquote>,
      ),
    )
    expect(wordsOf(nodes(screen.toJSON())[0] as Drawn)).toBe('“She said ‘soon’.')
  })

  test('draws nothing without marks', async () => {
    await render(themed(<HelixBlockquote>{PASSAGE}</HelixBlockquote>))
    expect(screen.queryByText('“', { includeHiddenElements: true })).toBeNull()
  })
})

describe('the passage’s lines', () => {
  test('align as `text-align` asks, the attribution too', async () => {
    await render(
      themed(
        <HelixBlockquote attribution="Maria Lopez" textAlign="center">
          {PASSAGE}
        </HelixBlockquote>,
      ),
    )
    expect(styleOf(textOf(PASSAGE)).textAlign).toBe('center')
    expect(styleOf(textOf('Maria Lopez')).textAlign).toBe('center')
  })

  test('break as `text-wrap` asks', async () => {
    await render(themed(<HelixBlockquote textWrap="balance">{PASSAGE}</HelixBlockquote>))
    expect(textOf(PASSAGE).props.textBreakStrategy).toBe('balanced')
  })
})
