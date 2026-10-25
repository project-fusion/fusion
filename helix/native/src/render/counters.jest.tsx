import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
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

/* An ordered list in miniature: each row is a list item, which increments
   the count by the list's step, and the first is set to where the list
   starts, as the list's own rules have it. While it holds no rows, it is
   empty, and says so. */
const list: Family = {
  api: {
    collection: {
      chosen: 'value',
      counts: { first: 'list-first', reversed: 'reversed', start: 'start', step: 'list-step' },
      empty: 'empty',
      keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
    },
    events: [],
    props: [
      { attribute: true, name: 'start', tier: 'headless', type: 'number' },
      { attribute: true, default: false, name: 'reversed', tier: 'headless', type: 'boolean' },
    ],
    states: ['empty'],
  },
  name: 'list',
  rules: [
    rule({
      order: 0,
      set: [
        ['display', { text: 'list-item' }],
        ['list-style-type', { text: 'decimal' }],
        [
          'counter-increment',
          {
            space: [
              { text: 'list-item' },
              { inherited: { fallback: { number: 1 }, name: 'list-step' } },
            ],
          },
        ],
      ],
      slotted: '*',
      specificity: [0, 2, 1],
      target: 'host',
    }),
    rule({
      order: 1,
      set: [
        ['counter-set', { space: [{ text: 'list-item' }, { inherited: { name: 'list-first' } }] }],
      ],
      slotted: '*',
      specificity: [0, 3, 1],
      target: 'host',
      when: [{ first: true, kind: 'child' }],
    }),
  ],
  tag: 'helix-list',
  tree: [
    { kind: 'region', name: 'default' },
    {
      children: [{ attributes: { says: 'Nothing yet' }, kind: 'text', name: 'empty-words' }],
      kind: 'when',
      name: 'empty',
    },
  ],
  version: '1.0',
}

/* A row in miniature: what is passed into it. */
const row: Family = {
  name: 'list-item',
  rules: [],
  tag: 'helix-list-item',
  tree: [{ kind: 'region', name: 'default' }],
  version: '1.0',
}

const List = element(list)
const Row = element(row)

/** Draws the list with `props` around three rows, and gives back the markers drawn, in order. */
const markers = async (props: Props) => {
  await render(
    <ThemeProvider tokens={{}}>
      <List {...props}>
        <Row key="one">One</Row>
        <Row key="two">Two</Row>
        <Row key="three">Three</Row>
      </List>
    </ThemeProvider>,
  )
  return screen
    .getAllByText(/^\d+\.$/, { includeHiddenElements: true })
    .map((marker) => marker.props.children)
}

describe('counters', () => {
  test('each row is numbered by its place among the list’s rows', async () => {
    expect(await markers({})).toEqual(['1.', '2.', '3.'])
  })

  test('a list that starts at a number counts its rows from it', async () => {
    expect(await markers({ start: 5 })).toEqual(['5.', '6.', '7.'])
  })

  test('a reversed list counts down from the number of its rows', async () => {
    expect(await markers({ reversed: true })).toEqual(['3.', '2.', '1.'])
  })

  test('a marker is hidden from a screen reader', async () => {
    await markers({})
    expect(screen.queryByText('1.')).toBeNull()
  })

  test('a list that holds no rows is empty', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <List />
      </ThemeProvider>,
    )
    expect(screen.getByText('Nothing yet')).toBeOnTheScreen()
  })
})
