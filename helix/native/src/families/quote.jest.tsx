/*
 * The generated Quote, drawn from its real intermediate form: a run nested
 * in the words around it, between the quotation marks of its language at its
 * depth, italic and quieter than the words around it. `test:native` writes
 * the component beside this file, as the styled package's build writes the
 * one it ships.
 */
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixQuote } from './quote/index.native'

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** Every word drawn, in order. */
const said = (): string => nodes(screen.toJSON()).map((node) => wordsOf(node))[0] ?? ''

/** The outermost text that holds `words`. */
const partOf = (words: string): Drawn => {
  const found = nodes(screen.toJSON()).find(
    (node) => node.type === 'Text' && wordsOf(node).includes(words),
  )
  if (found === undefined) {
    throw new Error(`no text holds ${words}`)
  }
  return found
}

describe('the generated Quote', () => {
  test('is a run nested in the words around it, between the marks', async () => {
    await render(
      themed(
        <Text>
          Alex said <HelixQuote>the report is ready</HelixQuote> during the call.
        </Text>,
      ),
    )
    expect(nodes(screen.toJSON()).every((node) => node.type === 'Text')).toBe(true)
    expect(said()).toBe('Alex said “the report is ready” during the call.')
  })

  test('is italic and quieter than the words around it', async () => {
    await render(themed(<HelixQuote>Quieter</HelixQuote>))
    const quote = nodes(screen.toJSON()).filter((node) => wordsOf(node).includes('Quieter'))[1]
    expect(quote).toBeDefined()
    expect(styleOf(quote as Drawn)).toMatchObject({
      color: light['color-foreground-muted'],
      fontStyle: 'italic',
    })
  })

  test('a quotation inside another takes the inner marks', async () => {
    await render(
      themed(
        <HelixQuote>
          outer <HelixQuote>inner</HelixQuote> back
        </HelixQuote>,
      ),
    )
    expect(said()).toBe('“outer ‘inner’ back”')
  })

  test('takes the marks of its language, which the quotations inside it keep', async () => {
    await render(
      themed(
        <>
          <HelixQuote lang="de">
            außen <HelixQuote>innen</HelixQuote>
          </HelixQuote>
          <HelixQuote lang="fr">la maison</HelixQuote>
        </>,
      ),
    )
    expect(wordsOf(partOf('außen'))).toBe('„außen ‚innen‘“')
    expect(wordsOf(partOf('maison'))).toBe('«la maison»')
  })

  test('says its language to a screen reader', async () => {
    await render(themed(<HelixQuote lang="de">Bitte</HelixQuote>))
    expect(partOf('Bitte').props.accessibilityLanguage).toBe('de')
  })

  test('no-marks draws none, and still counts the depth', async () => {
    await render(
      themed(
        <HelixQuote noMarks>
          outer <HelixQuote>inner</HelixQuote>
        </HelixQuote>,
      ),
    )
    expect(said()).toBe('outer ‘inner’')
  })
})
