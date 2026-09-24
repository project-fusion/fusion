import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const served = (extra = {}) =>
  withoutStyles(
    ssr(
      html`<helix-headless-canvas-node
        name="one"
        x=${10}
        y=${20}
        width=${150}
        height=${90}
        ...=${extra}
        >A card</helix-headless-canvas-node
      >`,
    ),
  )

describe('canvas node server output', () => {
  test('the card and its text are in the served markup', () => {
    /* This is the half of a board a page without JavaScript keeps: the cards a
       consumer wrote, with what they say, in the order they wrote them. */
    expect(rendered(served(), 'helix-headless-canvas-node')).toContain('part="node"')
    expect(served()).toContain('A card')
  })

  test('and it is an article before anything upgrades', () => {
    expect(partTag(served(), 'node')).toContain('role="article"')
  })

  test('the host carries only what the consumer typed', () => {
    /* Anything else is an attribute their server never sent, which React reports
       as a mismatch and does not patch up. */
    expect(hostAttributes(served(), 'helix-headless-canvas-node')).not.toContain('type')
  })
})
