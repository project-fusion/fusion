/*
 * A token a rule sets on a part, which the part's own subtree reads: the
 * parts inside it, and the elements passed into a region inside it, as a
 * custom property inherits down the flat tree on the web. The parts beside
 * it read the theme's own value.
 */
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>

const rule = (order: number, target: string, set: Rule['set']): Rule => ({
  kind: 'rule',
  order,
  set,
  specificity: [0, 1, 0],
  target,
  values: [],
  webOnly: false,
  when: [],
})

/** A panel that sets the foreground for what it holds, beside a part that does not. */
const panelForm: Family = {
  name: 'panel',
  rules: [
    rule(0, 'scoped', [['--helix-color-foreground', { text: '#ff0000' }]]),
    rule(1, 'inner', [['color', { token: 'color-foreground' }]]),
    rule(2, 'beside', [['color', { token: 'color-foreground' }]]),
  ],
  tag: 'helix-panel',
  tree: [
    {
      children: [
        {
          children: [{ attributes: { says: 'Inner' }, kind: 'text', name: 'inner-words' }],
          kind: 'box',
          name: 'inner',
        },
        { kind: 'region', name: 'default' },
      ],
      kind: 'box',
      name: 'scoped',
    },
    {
      children: [{ attributes: { says: 'Beside' }, kind: 'text', name: 'beside-words' }],
      kind: 'box',
      name: 'beside',
    },
  ],
  version: '1.1',
}

/** An element that draws its words in the foreground. */
const wordsForm: Family = {
  name: 'words',
  rules: [rule(0, 'host', [['color', { token: 'color-foreground' }]])],
  tag: 'helix-words',
  tree: [{ kind: 'region', name: 'default' }],
  version: '1.1',
}

const Panel = element(panelForm)
const Words = element(wordsForm)

/** A chip: words in a label box, which another element draws and styles. */
const chipForm: Family = {
  name: 'chip',
  rules: [
    rule(0, 'label', [
      ['color', { token: 'color-foreground' }],
      ['padding', { text: '2px' }],
    ]),
  ],
  tag: 'helix-chip',
  tree: [
    {
      children: [{ attributes: { says: 'Chip' }, kind: 'text', name: 'label-words' }],
      kind: 'box',
      name: 'label',
    },
  ],
  version: '1.1',
}
element(chipForm)

/** A card that draws a chip inside a part that sets the foreground, and styles the chip's label. */
const cardForm: Family = {
  name: 'card',
  rules: [
    rule(0, 'scoped', [['--helix-color-foreground', { text: '#00ff00' }]]),
    rule(1, 'badge-label', [['background-color', { text: '#0000ff' }]]),
  ],
  tag: 'helix-card',
  tree: [
    {
      children: [
        { attributes: { draws: 'chip', exports: { label: true } }, kind: 'box', name: 'badge' },
      ],
      kind: 'box',
      name: 'scoped',
    },
  ],
  version: '1.1',
}
const Card = element(cardForm)

/** The color a drawn text node's views give it, the nearest first. */
const colorOf = (words: string): unknown => {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText(words)
  while (node !== null) {
    const flat = Object.assign({}, ...[node.props.style].flat(5)) as Record<string, unknown>
    if (flat.color !== undefined) {
      return flat.color
    }
    node = node.parent
  }
  return undefined
}

describe('a token a part sets', () => {
  test('reaches the parts inside it and the elements passed in through it, and not the parts beside it', async () => {
    await render(
      <ThemeProvider tokens={{ 'color-foreground': '#000000' }}>
        <Panel>
          <Words>Passed</Words>
        </Panel>
      </ThemeProvider>,
    )
    expect(colorOf('Inner')).toBe('#ff0000')
    expect(colorOf('Passed')).toBe('#ff0000')
    expect(colorOf('Beside')).toBe('#000000')
  })

  test('reaches an element a box inside it draws, whose exported part takes the rules of the element around', async () => {
    await render(
      <ThemeProvider tokens={{ 'color-foreground': '#000000' }}>
        <Card />
      </ThemeProvider>,
    )
    expect(colorOf('Chip')).toBe('#00ff00')
    let node: ReturnType<typeof screen.getByText> | null = screen.getByText('Chip')
    let background: unknown
    while (node !== null && background === undefined) {
      background = (Object.assign({}, ...[node.props.style].flat(5)) as Record<string, unknown>)
        .backgroundColor
      node = node.parent
    }
    expect(background).toBe('#0000ff')
  })
})
