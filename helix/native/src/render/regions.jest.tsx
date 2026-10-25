import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { useInheritedText } from './around'
import type { Props } from './behavior'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A list in miniature: its rows, and a row after the last that says more are
   loading. */
const list: Family = {
  api: {
    collection: {
      chosen: 'value',
      keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
    },
    events: [],
    props: [
      { attribute: true, default: false, name: 'loading', tier: 'headless', type: 'boolean' },
      {
        attribute: true,
        default: 'Loading more',
        name: 'loading-label',
        tier: 'headless',
        type: 'string',
      },
    ],
    states: ['loading'],
  },
  name: 'list',
  rules: [],
  tag: 'helix-list',
  tree: [
    { kind: 'region', name: 'default' },
    {
      children: [
        {
          children: [
            {
              attributes: { says: { bind: 'loading-label' } },
              kind: 'text',
              name: 'loading-words',
            },
          ],
          kind: 'region',
          name: 'loading',
        },
      ],
      kind: 'when',
      name: 'loading',
    },
  ],
  version: '1.0',
}

/* A card in miniature: a body that colors what is passed into it. */
const card: Family = {
  api: { events: [], props: [], states: [] },
  name: 'card',
  rules: [
    rule({
      order: 0,
      set: [['color', { text: '#654321' }]],
      specificity: [0, 1, 0],
      target: 'body',
    }),
  ],
  tag: 'helix-card',
  tree: [
    { attributes: { part: 'end' }, kind: 'region', name: 'end' },
    { attributes: { part: 'body' }, kind: 'region', name: 'default' },
  ],
  version: '1.0',
}

/* A tab panel in miniature: hidden while it is not selected, with content
   drawn once it has shown. */
const panel: Family = {
  api: {
    events: [{ cancelable: false, detail: [], name: 'load' }],
    item: { of: 'tabs' },
    props: [{ attribute: true, default: false, name: 'lazy', tier: 'headless', type: 'boolean' }],
    states: ['loaded', 'selected'],
  },
  name: 'tabs-panel',
  rules: [],
  tag: 'helix-tab-panel',
  tree: [
    {
      attributes: { hidden: { not: 'selected' } },
      children: [{ attributes: { lazy: { bind: 'lazy' } }, kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'panel',
    },
  ],
  version: '1.0',
}

/** Draws `family` with `props` under a theme with no tokens. */
const draw = async (family: Family, props: Props = {}) => {
  const Drawn = element(family)
  return render(
    <ThemeProvider tokens={{}}>
      <Drawn {...props} />
    </ThemeProvider>,
  )
}

/** An icon passed into a region, drawn in the text style it inherits there. */
const Icon = () => (
  <Text style={useInheritedText()} testID="icon">
    Star
  </Text>
)

describe('regions', () => {
  test('a flag that names a region too draws the words the region falls back to', async () => {
    const { rerender } = await draw(list, { loading: true })
    expect(screen.getByText('Loading more')).toBeOnTheScreen()
    const List = element(list)
    await rerender(
      <ThemeProvider tokens={{}}>
        <List />
      </ThemeProvider>,
    )
    expect(screen.queryByText('Loading more')).toBeNull()
  })

  test('content passed into a region inherits its text style, and words beside it are words', async () => {
    await draw(card, { children: ['Words', <Icon key="icon" />] })
    expect(screen.getByText('Words')).toHaveStyle({ color: '#654321' })
    expect(screen.getByTestId('icon')).toHaveStyle({ color: '#654321' })
  })

  test('a named region draws the prop of its name', async () => {
    await draw(card, { children: 'Body', end: 'Footnote' })
    expect(screen.getByText('Footnote')).toBeOnTheScreen()
  })

  test('outside a region, content inherits no text style', async () => {
    await render(<Icon />)
    expect(screen.getByTestId('icon').props.style).toEqual({})
  })

  test('lazy content waits for its part to show, and then stays', async () => {
    const loads: unknown[] = []
    const Panel = element(panel, (_family, props) => ({
      marks: [],
      parts: { panel: { states: { selected: props.shown === true } } },
    }))
    const drawn = (shown: boolean) => (
      <ThemeProvider tokens={{}}>
        <Panel lazy onLoad={(event: unknown) => loads.push(event)} shown={shown}>
          Notes
        </Panel>
      </ThemeProvider>
    )
    const { rerender } = await render(drawn(false))
    expect(screen.queryByText('Notes')).toBeNull()
    await rerender(drawn(true))
    expect(screen.getByText('Notes')).toBeOnTheScreen()
    await rerender(drawn(false))
    expect(screen.getByText('Notes')).toBeOnTheScreen()
    expect(loads).toHaveLength(1)
  })
})
