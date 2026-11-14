/*
 * A set whose items open, as an accordion and its sections: each section
 * asks `before-open` or `before-close` by the way it turns, and the set holds
 * the sections to its mode. The forms are written here in the shape the
 * compiler writes, since no neutral family opens yet.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

const accordionForm: Family = {
  api: {
    collection: { keys: { chooses: false, keeps: [], wrap: false }, opens: 'mode', toggles: true },
    events: [],
    props: [
      {
        attribute: true,
        name: 'mode',
        tier: 'headless',
        type: ['multiple', 'single', 'single-collapsible'],
      },
    ],
    states: [],
  },
  machines: [{ bind: { opens: { prop: 'mode' } }, machine: 'toggle-set' }],
  name: 'accordion',
  rules: [],
  tag: 'helix-accordion',
  tree: [{ kind: 'region', name: 'default' }],
  version: '2.0',
}

const itemForm: Family = {
  api: {
    events: [
      { cancelable: true, detail: ['open'], name: 'before-close' },
      { cancelable: true, detail: ['open'], name: 'before-open' },
    ],
    item: { of: 'accordion' },
    props: [
      { attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' },
      { attribute: true, default: '', name: 'value', tier: 'headless', type: 'string' },
    ],
    states: [],
    toggle: { checked: 'open', closes: 'before-close', opens: 'before-open' },
  },
  machines: [
    { bind: { part: { part: 'trigger' } }, machine: 'press' },
    {
      bind: {
        checked: { prop: 'open' },
        closes: { event: 'before-close' },
        opens: { event: 'before-open' },
        part: { part: 'trigger' },
      },
      machine: 'toggle',
    },
  ],
  name: 'accordion-item',
  rules: [],
  tag: 'helix-accordion-item',
  tree: [
    {
      attributes: { expanded: { bind: 'open' }, toggles: true },
      children: [{ kind: 'region', name: 'summary' }],
      kind: 'pressable',
      name: 'trigger',
    },
    {
      attributes: { closed: { not: 'open' } },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'content',
    },
  ],
  version: '2.0',
}

const Accordion = element(accordionForm, behaviorFor(accordionForm))
const Item = element(itemForm, behaviorFor(itemForm))

type Heard = (name: string, value: string, event: { preventDefault: () => void }) => void

/** Three sections, Shipping open, under `mode`, with each event told to `heard`. */
const drawn = (mode: string | undefined, heard: Heard, written = 'shipping') => (
  <ThemeProvider tokens={{}}>
    <Accordion mode={mode}>
      {['shipping', 'returns', 'sizes'].map((value) => (
        <Item
          defaultOpen={false}
          key={value}
          onBeforeClose={(event: never) => heard('before-close', value, event)}
          onBeforeOpen={(event: never) => heard('before-open', value, event)}
          open={value === written ? true : undefined}
          summary={<Text>{value}</Text>}
          value={value}
        >
          <Text>{`${value} words`}</Text>
        </Item>
      ))}
    </Accordion>
  </ThemeProvider>
)

/** Whether a section says it is open, as its trigger tells a screen reader. */
const open = (value: string): boolean => {
  let at = screen.getByText(value).parent
  while (at !== null && at.props.accessibilityState === undefined) {
    at = at.parent
  }
  return at?.props.accessibilityState?.expanded === true
}

const press = async (value: string) => {
  await fireEvent.press(screen.getByText(value))
  await act(async () => undefined)
}

describe('a set whose items open', () => {
  test('sends before-open as a section opens, and closes its peers with before-close under single', async () => {
    const heard = jest.fn<Heard>()
    await render(drawn('single-collapsible', heard))
    await press('returns')
    expect(heard.mock.calls.map(([name, value]) => `${name} ${value}`)).toEqual([
      'before-open returns',
      'before-close shipping',
    ])
    expect([open('shipping'), open('returns')]).toEqual([false, true])
    await press('returns')
    expect(open('returns')).toBe(false)
  })

  test('keeps the open section open under single, and sends nothing', async () => {
    const heard = jest.fn<Heard>()
    await render(drawn('single', heard))
    await press('shipping')
    expect(heard).not.toHaveBeenCalled()
    expect(open('shipping')).toBe(true)
  })

  test('opens any number under multiple, and a refused open keeps the section closed', async () => {
    const heard = jest.fn<Heard>((name, _value, event) => {
      if (name === 'before-open') {
        event.preventDefault()
      }
    })
    await render(drawn(undefined, heard))
    await press('sizes')
    expect(open('sizes')).toBe(false)
    heard.mockImplementation(() => undefined)
    await press('sizes')
    expect([open('shipping'), open('sizes')]).toEqual([true, true])
  })

  test('closes the open section with before-close where the page opens another', async () => {
    const heard = jest.fn<Heard>()
    const view = await render(drawn('single-collapsible', heard))
    await act(async () => view.rerender(drawn('single-collapsible', heard, 'sizes')))
    expect(heard.mock.calls.map(([name, value]) => `${name} ${value}`)).toEqual([
      'before-close shipping',
    ])
    expect([open('shipping'), open('sizes')]).toEqual([false, true])
  })

  test('keeps a closed section drawn, out of what a screen reader reaches', async () => {
    await render(drawn(undefined, () => undefined))
    expect(screen.queryByText('returns words')).toBeNull()
    expect(screen.getByText('returns words', { includeHiddenElements: true })).toBeTruthy()
  })
})
