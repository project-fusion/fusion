import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  hostTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('canvas edge server output', () => {
  test('it serves the declaration and no drawing', () => {
    /* The board draws every connector into one layer under the cards, and it
       cannot draw one on a server where it cannot see them. What ships is which
       cards this joins, for the board to read on hydration. */
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-canvas-edge name="e1" from="a" to="b"></helix-headless-canvas-edge>`,
      ),
    )
    expect(hostAttributes(markup, 'helix-headless-canvas-edge').sort()).toEqual([
      'from',
      'name',
      'to',
    ])
    expect(hostTag(markup, 'helix-headless-canvas-edge')).toContain('from="a"')
    /* Lit's server emits the shadow template whatever is in it, so what "draws
       nothing" means here is that no element was written into it. */
    expect(rendered(markup, 'helix-headless-canvas-edge')).not.toMatch(/<(div|span|svg|path|a)\b/)
  })
})
