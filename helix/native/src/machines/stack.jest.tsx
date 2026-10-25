/*
 * A stack of pages, as a drilldown and its rows: a row that holds a page
 * shows it in place of the page showing, the back press goes up one level,
 * and each move asks first. The forms are written here in the shape the
 * compiler writes, since no neutral family drills yet.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

const drilldownForm: Family = {
  api: {
    collection: {
      keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
      mixes: true,
    },
    events: [{ cancelable: true, detail: ['value'], name: 'navigate' }],
    props: [{ attribute: true, default: '', name: 'page', tier: 'headless', type: 'string' }],
    stack: {
      back: 'back',
      before: 'navigate',
      drilled: 'drilled',
      label: 'page-label',
      page: 'page',
    },
    states: [],
  },
  machines: [
    { bind: { part: { part: 'back' } }, machine: 'press' },
    { bind: {}, machine: 'mixed-set' },
    { bind: {}, machine: 'roving-focus' },
    {
      bind: {
        back: { part: 'back' },
        before: { event: 'navigate' },
        drilled: { state: 'drilled' },
        label: { state: 'page-label' },
        page: { prop: 'page' },
      },
      machine: 'stack',
    },
  ],
  name: 'drilldown',
  rules: [],
  tag: 'helix-drilldown',
  tree: [
    {
      children: [
        {
          children: [
            { attributes: { label: 'Back' }, kind: 'pressable', name: 'back' },
            { attributes: { says: { bind: 'page-label' } }, kind: 'text', name: 'title' },
          ],
          kind: 'box',
          name: 'header',
        },
      ],
      kind: 'when',
      name: 'drilled',
    },
    { children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'rows' },
  ],
  version: '1.1',
}

const rowForm: Family = {
  api: {
    events: [{ cancelable: true, detail: ['value'], name: 'select' }],
    item: { chooses: true, of: 'drilldown', page: 'page' },
    props: [{ attribute: true, default: '', name: 'value', tier: 'headless', type: 'string' }],
    states: [],
  },
  machines: [
    { bind: { part: { part: 'row' }, sends: { event: 'select' } }, machine: 'press' },
    { bind: { page: { region: 'page' } }, machine: 'stack-row' },
  ],
  name: 'drilldown-item',
  rules: [],
  tag: 'helix-drilldown-item',
  tree: [
    {
      attributes: { chooses: true, role: 'menuitem', sends: 'select' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'row',
    },
    { kind: 'region', name: 'page' },
  ],
  version: '1.1',
}

const Drilldown = element(drilldownForm, behaviorFor(drilldownForm))
const Row = element(rowForm, behaviorFor(rowForm))

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  keys = { ...fake, listen: (node, hear) => fake.listen(node, hear) }
  setKeys(keys)
  focus = fakeFocus<unknown>()
  setFocus(focus)
})

type Navigate = (event: { detail: { value: string }; preventDefault: () => void }) => void

/** Settings, holding Display, which holds Text size, and About; and Help, with no page. */
const drawn = (navigate: Navigate = () => undefined, page?: string) => (
  <ThemeProvider tokens={{}}>
    <Drilldown onNavigate={navigate} {...(page === undefined ? {} : { page })}>
      <Row
        page={
          <>
            <Row
              page={
                <Row value="text">
                  <Text>Text size</Text>
                </Row>
              }
              value="display"
            >
              <Text>Display</Text>
            </Row>
            <Row value="about">
              <Text>About</Text>
            </Row>
          </>
        }
        value="settings"
      >
        <Text>Settings</Text>
      </Row>
      <Row value="help">
        <Text>Help</Text>
      </Row>
    </Drilldown>
  </ThemeProvider>
)

/** Whether a row reading `words` is drawn: words inside a menu item's press. */
const shown = (words: string) =>
  screen.queryAllByText(words).some((text) => {
    for (let at = text.parent; at !== null; at = at.parent) {
      if (at.props.accessibilityRole === 'menuitem') {
        return true
      }
    }
    return false
  })

const press = async (words: string) => {
  await fireEvent.press(screen.getByText(words))
  await act(async () => undefined)
}

describe('a stack of pages', () => {
  test('draws the top page alone, with no way back', async () => {
    await render(drawn())
    expect([shown('Settings'), shown('Help'), shown('Display'), shown('Text size')]).toEqual([
      true,
      true,
      false,
      false,
    ])
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  test('a row that holds a page shows it, asking first, with its name and a way back', async () => {
    const asked: string[] = []
    await render(drawn((event) => asked.push(event.detail.value)))
    await press('Settings')
    expect(asked).toEqual(['settings'])
    expect([shown('Settings'), shown('Help'), shown('Display'), shown('About')]).toEqual([
      false,
      false,
      true,
      true,
    ])
    /* The title says the page's name. */
    expect(screen.queryAllByText('Settings').length).toBe(1)
    await press('Display')
    expect([shown('Display'), shown('About'), shown('Text size')]).toEqual([false, false, true])
  })

  test('back goes up one level and lands on the row whose page it left', async () => {
    const asked: string[] = []
    await render(drawn((event) => asked.push(event.detail.value)))
    await press('Settings')
    await press('Display')
    await fireEvent.press(screen.getByLabelText('Back'))
    await act(async () => undefined)
    expect(asked).toEqual(['settings', 'display', 'settings'])
    expect([shown('Display'), shown('About'), shown('Text size')]).toEqual([true, true, false])
    await fireEvent.press(screen.getByLabelText('Back'))
    await act(async () => undefined)
    expect([shown('Settings'), shown('Help')]).toEqual([true, true])
    expect(asked.at(-1)).toBe('')
  })

  test('a refused move keeps the page showing', async () => {
    await render(drawn((event) => event.preventDefault()))
    await press('Settings')
    expect([shown('Settings'), shown('Display')]).toEqual([true, false])
  })

  test('the arrow into the line shows a row’s page, and Escape goes back', async () => {
    /* Each row's press, in the order it first listened for keys. */
    const nodes: unknown[] = []
    const fake = fakeKeys<unknown>()
    keys = {
      ...fake,
      listen: (node, hear) => {
        if (!nodes.includes(node)) {
          nodes.push(node)
        }
        return fake.listen(node, hear)
      },
    }
    setKeys(keys)
    await render(drawn())
    const [settings] = nodes
    await act(() => {
      expect(keys.press(settings, 'ArrowRight')).toBe(true)
    })
    expect(shown('Display')).toBe(true)
    /* Focus lands on Display, the first row of the page shown, which listens
       after the back press drawn above it. */
    const display = nodes[3]
    expect(focus.focused() === display).toBe(true)
    await act(() => {
      keys.press(display, 'Escape')
    })
    expect([shown('Settings'), shown('Display')]).toEqual([true, false])
    /* Settings' and Help's presses are drawn again, each a new view. */
    expect(nodes.length).toBe(7)
    expect(focus.focused() === nodes[5]).toBe(true)
  })

  test('writing the page prop shows that page', async () => {
    await render(drawn(undefined, 'display'))
    expect([shown('Settings'), shown('Display'), shown('Text size')]).toEqual([false, false, true])
  })
})
