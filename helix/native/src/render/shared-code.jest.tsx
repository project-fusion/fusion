import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'
import { sharedCodeWarnings, warnWebTag } from './shared-code'

/* A tab in miniature: `rel` and `shortcut` are the web's alone. */
const tab: Family = {
  api: {
    events: [
      { cancelable: true, detail: [], name: 'before-select' },
      { cancelable: false, detail: [], name: 'shortcut', platform: 'web' },
    ],
    props: [
      { attribute: true, name: 'value', tier: 'headless', type: 'string' },
      { attribute: true, name: 'rel', platform: 'web', tier: 'headless', type: 'string' },
      { attribute: true, name: 'max-items', platform: 'web', tier: 'headless', type: 'number' },
    ],
    states: [],
  },
  name: 'tab',
  rules: [],
  tag: 'helix-tab',
  tree: [{ kind: 'box', name: 'tab' }],
  version: '1.1',
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('shared code', () => {
  test('names each prop, event, and class only the web has', () => {
    expect(
      sharedCodeWarnings(tab, {
        className: 'tab',
        maxItems: 2,
        onBeforeSelect: () => {},
        onShortcut: () => {},
        rel: 'next',
        value: 'one',
      }),
    ).toEqual([
      '`className` on `helix-tab` names a CSS class, which a phone does not have.',
      "`max-items` on `helix-tab` is the web's alone. Set it in a `.web.tsx` file.",
      '`helix-tab` sends `helix-shortcut` on the web alone. Hear it in a `.web.tsx` file.',
      "`rel` on `helix-tab` is the web's alone. Set it in a `.web.tsx` file.",
    ])
  })

  test('a drawn element warns once for each web-only prop', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const Tab = element(tab)
    await render(
      <ThemeProvider tokens={{ 'color-foreground': '#000000' }}>
        <Tab rel="author" value="one" />
        <Tab rel="author" value="two" />
      </ThemeProvider>,
    )
    const said = warn.mock.calls.map(([message]) => message)
    expect(said).toEqual([
      "Helix: `rel` on `helix-tab` is the web's alone. Set it in a `.web.tsx` file.",
    ])
  })

  test('a DOM element and a web-only family are named', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    warnWebTag('div')
    warnWebTag('helix-dialog')
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      'Helix: `<div>` is a DOM element, which a phone does not draw. Use a Helix element, such as `helix-flex` for a box or `helix-text` for words.',
      'Helix: `<helix-dialog>` is drawn on the web alone. Use it in a `.web.tsx` file.',
    ])
  })
})
