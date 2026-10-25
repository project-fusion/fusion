/*
 * The generated Text, drawn from its real intermediate form: a run of words
 * in the ramp `as` and `variant` choose, a header where `as` is a heading,
 * cut off after `lines`, and nested in the words around it where it is
 * inline. `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { HelixCode } from './code/index.native'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixText } from './text/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => atTextSize(1))
afterEach(() => atTextSize(1))

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** The innermost text that holds all of `words`. */
const runOf = (words: string): Drawn => {
  const found = nodes(screen.toJSON())
    .filter((node) => node.type === 'Text' && wordsOf(node).includes(words))
    .at(-1)
  if (found === undefined) {
    throw new Error(`no text holds ${words}`)
  }
  return found
}

/** The text of the part, which takes the ramp: the outermost text holding `words`. */
const partOf = (words: string): Drawn => {
  const found = nodes(screen.toJSON()).find(
    (node) => node.type === 'Text' && wordsOf(node).includes(words),
  )
  if (found === undefined) {
    throw new Error(`no text holds ${words}`)
  }
  return found
}

/** A token's size in points at the default text size, where a rem is 16. */
const points = (name: keyof typeof light): number => Number.parseFloat(String(light[name])) * 16

describe('the generated Text', () => {
  test('a paragraph is a block holding one run of its words', async () => {
    await render(themed(<HelixText as="p">Update your name.</HelixText>))
    const drawn = nodes(screen.toJSON())
    expect(drawn[0]?.type).toBe('View')
    expect(drawn.filter((node) => node.type === 'View')).toHaveLength(1)
    expect(wordsOf(partOf('Update'))).toBe('Update your name.')
  })

  test('an inline text is a run with no view, nested in the words around it', async () => {
    await render(
      themed(
        <HelixText as="p">
          Set <HelixText as="strong">strong</HelixText> and <HelixCode>code</HelixCode> inline.
        </HelixText>,
      ),
    )
    const drawn = nodes(screen.toJSON())
    expect(drawn.filter((node) => node.type === 'View')).toHaveLength(1)
    expect(wordsOf(partOf('Set'))).toBe('Set strong and code inline.')
  })

  test('takes the ramp `as` matches, and a variant over it', async () => {
    await render(
      themed(
        <>
          <HelixText as="h2">Heading</HelixText>
          <HelixText as="h2" variant="caption">
            Caption
          </HelixText>
        </>,
      ),
    )
    expect(styleOf(partOf('Heading')).fontSize).toBeCloseTo(points('text-2xl'), 1)
    expect(styleOf(partOf('Heading')).fontWeight).toBe(String(light['weight-semibold']))
    expect(styleOf(partOf('Caption')).fontSize).toBeCloseTo(points('text-sm'), 1)
  })

  test('a text with no ramp keeps the size of the words around it', async () => {
    await render(themed(<HelixText>Plain</HelixText>))
    expect(styleOf(partOf('Plain')).fontSize).toBeCloseTo(points('text-md'), 1)
  })

  test('grows with the reader text size', async () => {
    atTextSize(2)
    await render(themed(<HelixText as="h1">Big</HelixText>))
    expect(styleOf(partOf('Big')).fontSize).toBeCloseTo(points('text-3xl') * 2, 1)
  })

  test('draws its tone, and the tone quiet under muted', async () => {
    await render(
      themed(
        <>
          <HelixText tone="danger">Danger</HelixText>
          <HelixText emphasis="muted" tone="danger">
            Hint
          </HelixText>
          <HelixText emphasis="muted">Muted</HelixText>
        </>,
      ),
    )
    expect(styleOf(runOf('Danger')).color).toBe(light['color-danger'])
    expect(styleOf(runOf('Hint')).color).toBe(light['color-danger-muted'])
    expect(styleOf(runOf('Muted')).color).toBe(light['color-foreground-muted'])
  })

  test('em is italic', async () => {
    await render(themed(<HelixText as="em">Slanted</HelixText>))
    expect(styleOf(runOf('Slanted')).fontStyle).toBe('italic')
  })

  test('stops after `lines`, with an ellipsis, and a count that is no count cuts nothing', async () => {
    await render(
      themed(
        <>
          <HelixText lines={2}>Two lines</HelixText>
          <HelixText lines={0}>No limit</HelixText>
        </>,
      ),
    )
    expect(partOf('Two lines').props).toMatchObject({ ellipsizeMode: 'tail', numberOfLines: 2 })
    expect(partOf('No limit').props.numberOfLines).toBeUndefined()
  })

  test('aligns and breaks its lines as `text-align` and `text-wrap` ask', async () => {
    await render(
      themed(
        <>
          <HelixText as="p" textAlign="center">
            Centered
          </HelixText>
          <HelixText as="h3" textWrap="balance">
            Balanced
          </HelixText>
          <HelixText textWrap="nowrap">One line</HelixText>
        </>,
      ),
    )
    expect(styleOf(partOf('Centered')).textAlign).toBe('center')
    expect(partOf('Balanced').props.textBreakStrategy).toBe('balanced')
    expect(partOf('One line').props.numberOfLines).toBe(1)
  })
})

describe('what a screen reader hears', () => {
  test('a heading is a header', async () => {
    await render(themed(<HelixText as="h2">Account settings</HelixText>))
    expect(partOf('Account settings').props.accessibilityRole).toBe('header')
  })

  test('a paragraph, a strong and an em are words, with no role', async () => {
    await render(
      themed(
        <>
          <HelixText as="p">Paragraph</HelixText>
          <HelixText as="strong">Strong</HelixText>
        </>,
      ),
    )
    expect(partOf('Paragraph').props.accessibilityRole).toBeUndefined()
    expect(partOf('Strong').props.accessibilityRole).toBeUndefined()
  })
})
