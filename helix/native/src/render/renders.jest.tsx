/*
 * A wrap that `renders` a function the element is given: what the function
 * returns stands in what the wrap holds, in each copy of a repeat, called
 * with what `passes` names and the copy's place, and the wrap draws what it
 * holds where no function is given. The form is written in the shape the
 * compiler writes, as a file input's rows are.
 */
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text, View } from 'react-native'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'

const rows: Family = {
  api: {
    events: [],
    props: [
      { attribute: true, name: 'rows', tier: 'headless', type: 'object' },
      {
        attribute: false,
        name: 'render-row',
        tier: 'headless',
        type: { function: '(row: object, index: number) => ReactNode' },
      },
    ],
    states: [],
  },
  name: 'rows',
  rules: [],
  tag: 'helix-rows',
  tree: [
    {
      attributes: { each: { bind: 'rows' }, key: 'id' },
      children: [
        {
          attributes: { passes: { field: 'row' }, renders: { bind: 'render-row' } },
          children: [{ attributes: { says: { field: 'words' } }, kind: 'text', name: 'words' }],
          kind: 'wrap',
          name: 'content',
        },
      ],
      kind: 'repeat',
      name: 'row',
    },
  ],
  version: '2.0',
}

const Rows = element(rows)

const entries = [
  { id: 'a', row: { name: 'alpha.png' }, words: 'Alpha' },
  { id: 'b', row: { name: 'beta.pdf' }, words: 'Beta' },
]

/** Every run of words drawn, in order. */
const said = (): string[] => screen.queryAllByText(/./).map((one) => String(one.props.children))

beforeEach(() => {
  setEnvironment(fakeEnvironment({ platform: 'android' }))
})

describe('a wrap that renders a function', () => {
  test('draws what the function returns in each copy, given what it passes and the copy’s place', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Rows
          renderRow={(row: { readonly name: string }, index: number) => (
            <View testID={`row-${index}`}>
              <Text>{`${index}: ${row.name}`}</Text>
            </View>
          )}
          rows={entries}
        />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['0: alpha.png', '1: beta.pdf'])
    expect(screen.getByTestId('row-1')).toBeTruthy()
  })

  test('draws the words a function returns as text', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Rows
          renderRow={(row: { readonly name: string }) => row.name.toUpperCase()}
          rows={entries}
        />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['ALPHA.PNG', 'BETA.PDF'])
  })

  test('draws what it holds where no function is given', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Rows rows={entries} />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['Alpha', 'Beta'])
  })
})
