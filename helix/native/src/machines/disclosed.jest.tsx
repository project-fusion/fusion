/*
 * `disclosed`: an element is in the state its collection names while an
 * element drawn inside it stands open, as a navigation is `open` while a
 * megamenu among its destinations is. An accordion section stands in for
 * the megamenu, whose toggle opens as a phone's megamenu will.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { HelixAccordionItem } from '../families/accordion/index.native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { HelixTheme } from '../theme/helix-theme'
import { behaviorFor } from './compose'

/* A shell drawn red while anything inside it stands open. */
const shell = {
  api: { events: [], props: [], states: ['open'] },
  machines: [{ bind: { state: { state: 'open' } }, machine: 'disclosed' }],
  name: 'shell',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['background-color', { text: 'red' }]],
      specificity: [0, 1, 0],
      target: 'host',
      values: [],
      webOnly: false,
      when: [{ kind: 'state', name: 'open' }],
    },
  ],
  tag: 'helix-shell',
  tree: [{ kind: 'region', name: 'default' }],
  version: '2.0',
} as unknown as Family

const Shell = element(shell, behaviorFor(shell))

beforeEach(() => {
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

/** The shell's fill, as its host, the outermost view, is drawn. */
const fill = () =>
  StyleSheet.flatten((screen.toJSON() as { props: { style?: unknown } }).props.style as never)
    ?.backgroundColor

/** The shell around a section that stands open as `open` says. */
const drawn = (open: boolean) => (
  <HelixTheme mode="light">
    <Shell>
      <HelixAccordionItem open={open} summary="Products">
        Every product we make.
      </HelixAccordionItem>
    </Shell>
  </HelixTheme>
)

describe('disclosed', () => {
  test('holds while an element inside stands open, and lets go as it closes', async () => {
    const view = await render(drawn(false))
    expect(fill()).toBeUndefined()
    await view.rerender(drawn(true))
    expect(fill()).toBe('red')
    await view.rerender(drawn(false))
    expect(fill()).toBeUndefined()
  })

  test('lets go as the element that stood open is taken away', async () => {
    const view = await render(drawn(true))
    expect(fill()).toBe('red')
    await view.rerender(
      <HelixTheme mode="light">
        <Shell />
      </HelixTheme>,
    )
    expect(fill()).toBeUndefined()
  })
})
