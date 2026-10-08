import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import './index.js'

/* The entry gives a list what it does in a browser, and nothing to serve: a
   reorderable list with it imported serves what a list without it does. */
describe('a reorderable virtual list on the server, with the reorder entry imported', () => {
  const list = (reorderable: boolean): string =>
    ssr(html`<helix-headless-virtual-list label="Order" ?reorderable=${reorderable}>
      <template><div data-field="name"></div></template>
    </helix-headless-virtual-list>`)

  test('serves the markup of a list that does not reorder', () => {
    expect(rendered(list(true), 'helix-headless-virtual-list').replace(' reorderable', '')).toBe(
      rendered(list(false), 'helix-headless-virtual-list'),
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(list(true), 'helix-headless-virtual-list')).toEqual([
      'label',
      'reorderable',
    ])
  })
})
