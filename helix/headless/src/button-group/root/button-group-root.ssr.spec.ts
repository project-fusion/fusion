import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-headless-button-group label="Text alignment">
  <helix-headless-button>Left</helix-headless-button>
  <helix-headless-button>Right</helix-headless-button>
</helix-headless-button-group>`

describe('button group server output', () => {
  test('a bare slot ships, which is what serves the buttons', () => {
    /* `toContain('Left')` read the host's own light-DOM children back out of
       the render, so it passed with the group rendering no slot at all, and an
       unassigned button paints nothing. Read off a group with no children, so
       the only shadow root here is the group's own. */
    const empty = ssr(
      html`<helix-headless-button-group label="Text alignment"></helix-headless-button-group>`,
    )
    expect(rendered(empty, 'helix-headless-button-group')).toContain('<slot></slot>')
  })

  test('the group role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-button-group')).toEqual(['label'])
  })

  test('a selection mode renders on a server, which has no buttons to tell, and adds nothing', () => {
    /* The pressed state and the tab stop are written once the buttons have
       rendered on the client, inside each button, so the host is served as
       written. */
    const toggles = html`<helix-headless-button-group label="View" selection-mode="single" value="week">
      <helix-headless-button value="day">Day</helix-headless-button>
      <helix-headless-button value="week">Week</helix-headless-button>
    </helix-headless-button-group>`
    expect(hostAttributes(ssr(toggles), 'helix-headless-button-group')).toEqual([
      'label',
      'selection-mode',
      'value',
    ])
  })
})
