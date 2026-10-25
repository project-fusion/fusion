/*
 * A repeat over a list: a copy for each entry of the list a derivation
 * computes or a prop holds, keyed by the entry's `key`, reading its fields
 * and its place. And a part named by the words passed into a region. The
 * forms are written in the shape the compiler writes, since no neutral
 * family draws a list yet.
 */
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'

const chord: Family = {
  api: {
    events: [],
    props: [{ attribute: true, default: '', name: 'keys', tier: 'headless', type: 'string' }],
    states: [],
  },
  name: 'chord',
  rules: [],
  tag: 'helix-chord',
  tree: [
    {
      attributes: { each: { derive: 'kbdKeyList' }, key: 'at' },
      children: [
        { attributes: { says: { field: 'separator' } }, kind: 'text', name: 'separator' },
        { attributes: { says: { field: 'key' } }, kind: 'text', name: 'key' },
      ],
      kind: 'repeat',
      name: 'keys',
    },
  ],
  version: '1.1',
}

const entries: Family = {
  api: {
    events: [],
    props: [{ attribute: true, name: 'entries', tier: 'headless', type: 'object' }],
    states: [],
  },
  name: 'entries',
  rules: [],
  tag: 'helix-entries',
  tree: [
    {
      attributes: { each: { bind: 'entries' }, key: 'id' },
      children: [
        { attributes: { says: { index: true } }, kind: 'text', name: 'place' },
        { attributes: { says: { field: 'words' } }, kind: 'text', name: 'words' },
      ],
      kind: 'repeat',
      name: 'entry',
    },
  ],
  version: '1.1',
}

const section: Family = {
  api: { events: [], props: [], states: [] },
  name: 'section',
  rules: [],
  tag: 'helix-section',
  tree: [
    { kind: 'region', name: 'summary' },
    {
      attributes: { labelledby: 'summary', role: 'region' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'content',
    },
  ],
  version: '1.1',
}

const Chord = element(chord)
const Entries = element(entries)
const Section = element(section, () => ({
  marks: [],
  parts: { content: { view: { testID: 'content' } } },
}))

/** Every run of words drawn, in order. */
const said = (): string[] => screen.queryAllByText(/./).map((one) => String(one.props.children))

beforeEach(() => {
  setEnvironment(fakeEnvironment({ platform: 'android' }))
})

describe('a repeat over a list', () => {
  test('draws a copy for each entry a derivation computes, reading its fields', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Chord keys="mod+k" />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['Ctrl', '+', 'K'])
  })

  test('draws a copy for each entry a prop holds, with its place from 0', async () => {
    const view = await render(
      <ThemeProvider tokens={{}}>
        <Entries
          entries={[
            { id: 'a', words: 'Alpha' },
            { id: 'b', words: 'Beta' },
          ]}
        />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['0', 'Alpha', '1', 'Beta'])
    await view.rerender(
      <ThemeProvider tokens={{}}>
        <Entries
          entries={[
            { id: 'b', words: 'Beta' },
            { id: 'a', words: 'Alpha' },
            { id: 'a', words: 'Again' },
          ]}
        />
      </ThemeProvider>,
    )
    expect(said()).toEqual(['0', 'Beta', '1', 'Alpha', '2', 'Again'])
  })

  test('draws nothing for a prop that holds no list', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Entries entries="none" />
        <Text>after</Text>
      </ThemeProvider>,
    )
    expect(said()).toEqual(['after'])
  })
})

describe('a part labeled by a region', () => {
  test('is named by the words passed into the region', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Section summary={<Text>Shipping</Text>}>
          <Text>Ships in two days.</Text>
        </Section>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('content').props.accessibilityLabel).toBe('Shipping')
  })
})
