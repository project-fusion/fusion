/*
 * A host that says `color-scheme`, as a lightbox says it is dark: the
 * element's own parts and the elements passed into it draw in that scheme's
 * tokens on a page in the other, and a host that says it only under a
 * condition draws in the page's.
 */
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { Family } from '../style/form'
import { dark } from '../theme/dark.generated'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { element } from './element'
import { hostScheme } from './host-scheme'

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>

const rule = (order: number, target: string, set: Rule['set'], when: Rule['when'] = []): Rule => ({
  kind: 'rule',
  order,
  set,
  specificity: [0, 1, 0],
  target,
  values: [],
  webOnly: false,
  when,
})

/** A room that says it is dark, with words of its own and a region. */
const roomForm = (when: Rule['when'] = []): Family => ({
  name: 'room',
  rules: [
    rule(0, 'host', [['color-scheme', { text: 'dark' }]], when),
    rule(1, 'own', [['color', { token: 'color-foreground' }]]),
  ],
  tag: 'helix-room',
  tree: [
    {
      children: [{ attributes: { says: 'Own' }, kind: 'text', name: 'own-words' }],
      kind: 'box',
      name: 'own',
    },
    { kind: 'region', name: 'default' },
  ],
  version: '2.0',
})

/** An element passed in, which draws its words in the foreground. */
const Words = element({
  name: 'words',
  rules: [rule(0, 'host', [['color', { token: 'color-foreground' }]])],
  tag: 'helix-words',
  tree: [{ kind: 'region', name: 'default' }],
  version: '2.0',
})

/** The color a drawn text node's views give it, the nearest first. */
const colorOf = (words: string): unknown => {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText(words)
  while (node !== null) {
    const flat = StyleSheet.flatten(node.props.style) as Record<string, unknown> | undefined
    if (flat?.color !== undefined) {
      return flat.color
    }
    node = node.parent
  }
  return undefined
}

const lower = (value: unknown): string => String(value).toLowerCase()

describe('a host that says its color scheme', () => {
  test('is read where the host always says it, and not under a condition', () => {
    expect(hostScheme(roomForm())).toBe('dark')
    expect(hostScheme(roomForm([{ kind: 'state', name: 'open' }]))).toBeUndefined()
  })

  test('draws its own parts and what is passed in in the dark scheme on a light page', async () => {
    const Room = element(roomForm())
    await render(
      <HelixTheme mode="light">
        <Room>
          <Words>Passed</Words>
        </Room>
      </HelixTheme>,
    )
    expect(lower(colorOf('Own'))).toBe(lower(dark['color-foreground']))
    expect(lower(colorOf('Passed'))).toBe(lower(dark['color-foreground']))
    expect(lower(dark['color-foreground'])).not.toBe(lower(light['color-foreground']))
  })

  test('a host that says it only in a state draws in the page scheme', async () => {
    const Room = element(roomForm([{ kind: 'state', name: 'open' }]))
    await render(
      <HelixTheme mode="light">
        <Room />
      </HelixTheme>,
    )
    expect(lower(colorOf('Own'))).toBe(lower(light['color-foreground']))
  })
})
