import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  hostTag,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * What a board is on the server, which is less than it is on the client and
 * more than it was.
 *
 * **A parent cannot see its children while it is being rendered**, which `Tabs`
 * states in as many words: `children` is undefined there, so there is nothing to
 * count. So the plane, the connectors and the tab stop are assembled on
 * hydration, and what the served markup carries is the cards themselves, with
 * their text and their coordinates, because the consumer wrote them and every
 * renderer emits what was written.
 *
 * That is the trade this family took when it stopped taking a document as a
 * property: a property is rendered by Lit's server and skipped by React's, so
 * the old shape served everything in one renderer and nothing in the other.
 */
const served = () =>
  withoutStyles(
    ssr(html`<helix-headless-canvas label="A board">
      <helix-headless-canvas-node id="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
      <helix-headless-canvas-node id="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
      <helix-headless-canvas-edge id="e1" from="a" to="b"></helix-headless-canvas-edge>
    </helix-headless-canvas>`),
  )

describe('canvas server output', () => {
  test('a card renders its own text on the server, rather than being echoed', () => {
    /* `rendered` takes the host tag off, so this asks what the card's own shadow
       output carries rather than reading the consumer's markup back. */
    expect(rendered(served(), 'helix-headless-canvas-node')).toContain('First')
  })

  test('and its coordinates are on the host where the board will read them', () => {
    const attributes = hostAttributes(served(), 'helix-headless-canvas-node')
    expect(attributes).toContain('x')
    expect(attributes).toContain('y')
    expect(hostTag(served(), 'helix-headless-canvas-node')).toContain('x="0"')
  })

  test('a card is an article on the server too, which is what a reader meets first', () => {
    expect(partTag(served(), 'node')).toContain('role="article"')
  })

  test('the frame is named where the server can be read', () => {
    expect(partTag(served(), 'region')).toContain('aria-label="A board"')
    expect(hostAttributes(served(), 'helix-headless-canvas')).not.toContain('aria-label')
  })

  test('the tab stop is served, so the keys work before hydration finishes', () => {
    expect(partTag(served(), 'region')).toContain('tabindex="0"')
  })

  test('no card holds the tab stop on the server, the board not having counted them', () => {
    /* Not a failure: which card is first in reading order is arithmetic over
       cards a server cannot see, so the stop is given on hydration and the
       region's own stop is what a reader has until then. */
    expect(partTag(served(), 'node')).toContain('tabindex="-1"')
  })

  test('an edge is served carrying what it joins', () => {
    /* The line between two cards is the board's to draw, and it cannot draw one
       on a server where it cannot see them. What an edge ships is the
       declaration, and `canvas-edge.ssr.spec.ts` is where what it draws is
       asserted, the host being its own to answer for. */
    expect(hostAttributes(served(), 'helix-headless-canvas-edge').sort()).toEqual([
      'from',
      'id',
      'to',
    ])
  })
})
