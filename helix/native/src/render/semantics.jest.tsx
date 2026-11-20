import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { afterEach, describe, expect, test } from '@jest/globals'
import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import type { UseBehavior } from './behavior'
import { element } from './element'

/* A tab in miniature: it joins a set, with a close mark for the pointer. */
const tab: Family = {
  api: {
    events: [
      { cancelable: true, detail: ['label'], name: 'dismiss' },
      { cancelable: true, detail: ['value'], name: 'before-select' },
    ],
    item: { chooses: true, of: 'tabs' },
    props: [
      { attribute: true, default: false, name: 'dismissible', tier: 'headless', type: 'boolean' },
      {
        attribute: true,
        default: 'Close',
        name: 'dismiss-label',
        tier: 'headless',
        type: 'string',
      },
      { attribute: true, default: '', name: 'value', tier: 'headless', type: 'string' },
    ],
    states: ['selected'],
  },
  name: 'tabs-tab',
  rules: [],
  tag: 'helix-tab',
  tree: [
    {
      attributes: {
        chooses: true,
        role: 'tab',
        selected: { bind: 'selected' },
        sends: 'before-select',
      },
      children: [
        { kind: 'region', name: 'default' },
        {
          children: [
            {
              attributes: {
                decorative: true,
                label: { bind: 'dismiss-label' },
                sends: 'dismiss',
              },
              kind: 'pressable',
              name: 'dismiss',
            },
          ],
          kind: 'when',
          name: 'dismissible',
        },
      ],
      kind: 'pressable',
      name: 'tab',
    },
  ],
  version: '2.0',
}

/* A row in miniature: a press that wraps a link around its words. */
const row: Family = {
  api: {
    events: [{ cancelable: false, detail: ['value'], name: 'action' }],
    item: { chooses: true, of: 'list' },
    props: [
      { attribute: true, default: '', name: 'href', tier: 'headless', type: 'string' },
      { attribute: true, default: '', name: 'value', tier: 'headless', type: 'string' },
    ],
    states: [],
  },
  name: 'list-item',
  rules: [],
  tag: 'helix-list-item',
  tree: [
    {
      attributes: { chooses: true },
      children: [
        {
          attributes: { href: { bind: 'href' } },
          children: [{ kind: 'region', name: 'default' }],
          kind: 'wrap',
          name: 'link',
        },
      ],
      kind: 'pressable',
      name: 'row',
    },
  ],
  version: '2.0',
}

/* A press that says its pending words, as Button does. */
const button: Family = {
  api: {
    events: [],
    props: [
      { attribute: true, default: false, name: 'pending', tier: 'headless', type: 'boolean' },
      {
        attribute: true,
        default: 'Loading',
        name: 'pending-label',
        tier: 'headless',
        type: 'string',
      },
    ],
    states: ['pending'],
  },
  name: 'button',
  rules: [],
  tag: 'helix-button',
  tree: [
    {
      attributes: { busy: { bind: 'pending' }, role: 'button' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'button',
    },
    {
      attributes: { says: { bind: 'pending-label' }, while: { bind: 'pending' } },
      kind: 'live',
      name: 'live',
    },
  ],
  version: '2.0',
}

const original: Announce = announce()

afterEach(() => {
  setAnnounce(original)
})

describe('semantics', () => {
  test('a tab is selected while its binding says so', async () => {
    const chosen: UseBehavior = (_family, props) => ({
      marks: [],
      parts: { tab: { states: { selected: props.value === 'two' } } },
    })
    const Tab = element(tab, chosen)
    await render(
      <ThemeProvider tokens={{}}>
        <Tab value="one">One</Tab>
        <Tab value="two">Two</Tab>
      </ThemeProvider>,
    )
    expect(screen.getByRole('tab', { name: 'Two' })).toBeSelected()
    expect(screen.getByRole('tab', { name: 'One' })).not.toBeSelected()
  })

  test('a close mark for the pointer is offered to a screen reader as an action of the tab', async () => {
    const Tab = element(tab, () => ({
      marks: [],
      parts: { dismiss: { view: { testID: 'dismiss' } } },
    }))
    await render(
      <ThemeProvider tokens={{}}>
        <Tab dismissible value="notes">
          Notes
        </Tab>
      </ThemeProvider>,
    )
    expect(screen.getByRole('tab').props.accessibilityActions).toEqual([
      { label: 'Close', name: 'dismiss' },
    ])
    const mark = screen.getByTestId('dismiss', { includeHiddenElements: true })
    expect(isHiddenFromAccessibility(mark)).toBe(true)
  })

  test('a press whose link wraps its words is named a link, and one with no link is not', async () => {
    const Row = element(row)
    await render(
      <ThemeProvider tokens={{}}>
        <Row href="/projects/1" value="one">
          Website
        </Row>
        <Row value="two">Notes</Row>
      </ThemeProvider>,
    )
    expect(screen.getAllByRole('link')).toEqual([screen.getByRole('link', { name: 'Website' })])
  })

  test('a live node says its words as its prop turns on, once a part of the element was pressed', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    const Button = element(button, (_family, props) => ({
      marks: [],
      parts: { button: { states: { active: props.held === true } } },
    }))
    const drawn = (props: Readonly<Record<string, unknown>>) => (
      <ThemeProvider tokens={{}}>
        <Button {...props}>Save</Button>
      </ThemeProvider>
    )
    const { rerender } = await render(drawn({}))
    await rerender(drawn({ pending: true }))
    expect(said.said).toEqual([])
    await rerender(drawn({ held: true }))
    await rerender(drawn({ pending: true }))
    expect(said.said).toEqual([{ message: 'Loading', urgency: 'polite' }])
  })
})
