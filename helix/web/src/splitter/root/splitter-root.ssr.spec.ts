import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const split = html`<helix-splitter default-position="30">
  <div slot="start">one</div>
  <div slot="end">two</div>
</helix-splitter>`

describe('splitter server output', () => {
  test('both panes and the divider ship, laid out before any script runs', () => {
    expect(hasPart(ssr(split), 'start')).toBe(true)
    expect(hasPart(ssr(split), 'end')).toBe(true)
    expect(hasPart(ssr(split), 'separator')).toBe(true)
  })

  test('the position is already in the markup, so nothing jumps on hydration', () => {
    // The number is on the pane rather than the host, which is what lets the
    // server write it at all: an inline style on a host the consumer rendered is
    // markup their output never had.
    expect(partTag(ssr(split), 'start')).toContain('30%')
  })

  test('the divider is a separator with its range, before it can be dragged', () => {
    const bar = partTag(ssr(split), 'separator')
    expect(bar).toContain('role="separator"')
    expect(bar).toContain('aria-valuenow="30"')
    expect(bar).toContain('tabindex="0"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(split), 'helix-splitter')).toEqual(['default-position'])
  })
})
