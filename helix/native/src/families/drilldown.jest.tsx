/*
 * The generated Drilldown, drawn from its real intermediate forms: a stack
 * of pages of rows, one page drawn at a time, where a row with a page goes
 * into it, the way back goes up one level, and each move asks `navigate`
 * first. A row with no page sends `select`, and follows its link once the
 * event stands. `test:native` writes the components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { nodes, styleOf, wordsOf } from './drawn'
import { HelixDrilldown, HelixDrilldownItem } from './drilldown/index.native'

let keys: FakeKeys<unknown>
let focus: FakeFocus<unknown>
let opened: FakeOpenLink
/* Each row's press, in the order it first listened for keys. */
let listened: unknown[] = []

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  listened = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!listened.includes(node)) {
        listened.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
  focus = fakeFocus<unknown>()
  setFocus(focus)
  opened = fakeOpenLink()
  setOpenLink(opened)
})

type Told = { detail: { value: string }; preventDefault: () => void }

/** Settings: Appearance, which holds Theme and Density; Editor, a link; and About. */
const settings = (props: Readonly<Record<string, unknown>> = {}) => (
  <ThemeProvider tokens={light}>
    <HelixDrilldown label="Settings" {...props}>
      <HelixDrilldownItem
        page={
          <>
            <HelixDrilldownItem value="theme">Theme</HelixDrilldownItem>
            <HelixDrilldownItem value="density">Density</HelixDrilldownItem>
          </>
        }
        value="appearance"
      >
        Appearance
      </HelixDrilldownItem>
      <HelixDrilldownItem href="https://example.com/editor" value="editor">
        Editor
      </HelixDrilldownItem>
      <HelixDrilldownItem description={<Text>Version and licenses</Text>} value="about">
        About
      </HelixDrilldownItem>
    </HelixDrilldown>
  </ThemeProvider>
)

/** Whether a row reading `words` is drawn: words inside a menu item's press. */
const shown = (words: string) =>
  screen.queryAllByText(words).some((text) => {
    for (let at = text.parent; at !== null; at = at.parent) {
      if (at.props.role === 'menuitem' || at.props.accessibilityRole === 'menuitem') {
        return true
      }
    }
    return false
  })

/** The press whose words are `words`. */
const row = (words: string) => {
  for (let at = screen.getByText(words).parent; at !== null; at = at.parent) {
    if (at.props.role === 'menuitem' || at.props.accessibilityRole === 'menuitem') {
      return at
    }
  }
  return null
}

/** A view's role, as React Native's `role` or its `accessibilityRole`. */
const roleOf = (view: { readonly props: Readonly<Record<string, unknown>> }) =>
  view.props.role ?? view.props.accessibilityRole

const press = async (words: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(words))
  })
}

describe('the generated Drilldown', () => {
  test('draws the top page alone, named by its label, with no way back', async () => {
    await render(settings())
    expect([shown('Appearance'), shown('Editor'), shown('Theme')]).toEqual([true, true, false])
    expect(screen.queryByLabelText('Back')).toBeNull()
    expect(roleOf(screen.getByLabelText('Settings'))).toBe('menu')
  })

  test('a row with a page goes into it, asking first, and names the page in its header', async () => {
    const asked: string[] = []
    await render(settings({ onNavigate: (event: Told) => asked.push(event.detail.value) }))
    expect(row('Appearance')?.props.accessibilityHint).toBeUndefined()
    await press('Appearance')
    expect(asked).toEqual(['appearance'])
    expect([shown('Appearance'), shown('Theme'), shown('Density')]).toEqual([false, true, true])
    expect(screen.getAllByText('Appearance').length).toBe(1)
    expect(roleOf(screen.getByLabelText('Appearance'))).toBe('menu')
  })

  test('slides each page in anew, as the web writes its direction again with each move', async () => {
    await render(settings())
    const slide = () =>
      styleOf(
        nodes(screen.toJSON()).find((node) => node.props.accessibilityLabel === 'Appearance') ?? {
          props: {},
        },
      ).animationName
    await press('Appearance')
    const first = slide()
    expect(first).toBeDefined()
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Back'))
    })
    await press('Appearance')
    const again = slide()
    expect(again).toBeDefined()
    expect(again === first).toBe(false)
  })

  test('the way back goes up one level, asking first, and lands on the row it left', async () => {
    const asked: string[] = []
    await render(settings({ onNavigate: (event: Told) => asked.push(event.detail.value) }))
    await press('Appearance')
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Back'))
    })
    expect(asked).toEqual(['appearance', ''])
    expect([shown('Appearance'), shown('Theme')]).toEqual([true, false])
    expect(focus.focused()).toBe(listened.at(-3))
  })

  test('a refused move keeps the page showing', async () => {
    await render(settings({ onNavigate: (event: Told) => event.preventDefault() }))
    await press('Appearance')
    expect([shown('Appearance'), shown('Theme')]).toEqual([true, false])
  })

  test('a row with no page sends select, which the drilldown hears, and follows its link', async () => {
    const chosen: string[] = []
    await render(settings({ onSelect: (event: Told) => chosen.push(event.detail.value) }))
    await press('Editor')
    expect(chosen).toEqual(['editor'])
    expect(opened.opened).toEqual(['https://example.com/editor'])
    await render(settings({ onSelect: (event: Told) => event.preventDefault() }))
    await press('Editor')
    expect(opened.opened).toEqual(['https://example.com/editor'])
  })

  test('a row is described by its description, and named by its label alone', async () => {
    await render(settings())
    const about = row('About')
    expect(about?.props.accessibilityHint).toBe('Version and licenses')
  })

  test('the arrow into the line goes into a page, and Escape comes back', async () => {
    await render(settings())
    const [appearance] = listened
    await act(() => {
      expect(keys.press(appearance, 'ArrowRight')).toBe(true)
    })
    expect(shown('Theme')).toBe(true)
    const theme = focus.focused()
    expect(theme).not.toBeNull()
    await act(() => {
      keys.press(theme, 'Escape')
    })
    expect([shown('Appearance'), shown('Theme')]).toEqual([true, false])
  })

  test('writing the page prop shows that page', async () => {
    await render(settings({ page: 'appearance' }))
    expect([shown('Appearance'), shown('Theme')]).toEqual([false, true])
  })

  test('says its loading words while it loads, and its empty words with no rows', async () => {
    await render(
      <ThemeProvider tokens={light}>
        <HelixDrilldown label="Files" loading />
      </ThemeProvider>,
    )
    expect(screen.queryByText('Loading')).not.toBeNull()
    await render(
      <ThemeProvider tokens={light}>
        <HelixDrilldown emptyText="No files" label="Files" />
      </ThemeProvider>,
    )
    expect(screen.queryByText('No files')).not.toBeNull()
  })

  test('is a navigation landmark under navigation', async () => {
    await render(settings({ navigation: true }))
    const host = nodes(screen.toJSON()).find((node) => roleOf(node) === 'navigation')
    expect(host?.props.accessibilityLabel).toBe('Settings')
  })

  test('under navigation, each page is a list of items that hold a link or a button', async () => {
    await render(settings({ navigation: true }))
    /* The innermost node of `role` whose words start with `words`. */
    const holding = (role: string, words: string) =>
      nodes(screen.toJSON())
        .filter((node) => roleOf(node) === role && wordsOf(node).startsWith(words))
        .at(-1)
    const rowOf = (words: string) => holding('button', words) ?? holding('link', words)
    expect(nodes(screen.toJSON()).some((node) => roleOf(node) === 'list')).toBe(true)
    expect(
      ['Appearance', 'Editor', 'About'].map((words) => roleOf(rowOf(words) ?? { props: {} })),
    ).toEqual(['button', 'link', 'button'])
    expect(['Appearance', 'Editor', 'About'].every((words) => holding('listitem', words))).toBe(
      true,
    )
    /* A row that opens a page says no menu opens from it. */
    const state = rowOf('Appearance')?.props.accessibilityState as
      | { expanded?: boolean }
      | undefined
    expect(state?.expanded).toBeUndefined()
    await press('Appearance')
    expect(roleOf(rowOf('Theme') ?? { props: {} })).toBe('button')
    expect(holding('listitem', 'Theme')).toBeDefined()
  })
})
