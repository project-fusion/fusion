/*
 * The generated Code, drawn from its real intermediate form: a run of code
 * nested in the words around it, washed, in the mono face, a step smaller
 * than the words it sits in. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixCode } from './code/index.native'
import { type Drawn, nodes, styleOf } from './drawn'

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

/** The code's run: the text that is washed. */
const washed = (): Drawn => {
  const found = nodes(screen.toJSON()).find(
    (node) => node.type === 'Text' && styleOf(node).backgroundColor !== undefined,
  )
  if (found === undefined) {
    throw new Error('no washed run')
  }
  return found
}

describe('the generated Code', () => {
  test('is a run of text nested in the words around it, with no view of its own', async () => {
    await render(
      themed(
        <Text>
          Run <HelixCode>bun install</HelixCode> first.
        </Text>,
      ),
    )
    const drawn = nodes(screen.toJSON())
    expect(drawn.every((node) => node.type === 'Text')).toBe(true)
    expect(screen.getByText(/Run/).props.children).toEqual(
      expect.arrayContaining(['Run ', ' first.']),
    )
  })

  test('is washed in the ink and set in the mono face', async () => {
    await render(themed(<HelixCode>size</HelixCode>))
    const run = styleOf(washed())
    expect(run.backgroundColor).toBe('rgba(0, 0, 0, 0.06)')
    expect(run.fontFamily).toBe('ui-monospace')
    expect(run.color).not.toBe('#000000')
  })

  /* `text-sm` over `text-md`, times the 14 points of the page's words. */
  test('is a step smaller than the words it sits in', async () => {
    await render(themed(<HelixCode>size</HelixCode>))
    expect(styleOf(washed()).fontSize).toBeCloseTo(13, 1)
  })

  test('grows with the reader text size', async () => {
    atTextSize(2)
    await render(themed(<HelixCode>grown</HelixCode>))
    expect(styleOf(washed()).fontSize).toBeCloseTo(26, 1)
  })

  test('has no role of its own, as a phone has no element for code', async () => {
    await render(themed(<HelixCode>role</HelixCode>))
    const props = washed().props as Readonly<Record<string, unknown>>
    expect(props.accessibilityRole).toBeUndefined()
    expect(props.role).toBeUndefined()
  })
})
