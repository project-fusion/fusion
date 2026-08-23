import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const split = html`<helix-base-splitter default-position="30">
  <div slot="start">one</div>
  <div slot="end">two</div>
</helix-base-splitter>`

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
    expect(hostAttributes(ssr(split), 'helix-base-splitter')).toEqual(['default-position'])
  })
})

const nest = html`<helix-base-splitter default-position="30">
  <div slot="start">one</div>
  <helix-base-splitter orientation="vertical" slot="end">
    <div slot="start">two</div>
    <div slot="end">three</div>
  </helix-base-splitter>
</helix-base-splitter>`

const shut = html`<helix-base-splitter default-position="40" default-collapsed="start">
  <div slot="start">one</div>
  <div slot="end">two</div>
</helix-base-splitter>`

describe('splitter crossings on a server', () => {
  test('no corner is served, because a server cannot see the tree', () => {
    // It is an affordance rather than content, so it is allowed to arrive at
    // hydration. Until it does there are still two working dividers.
    //
    // The divider is asserted alongside it, and that is the point of the pair:
    // written against a raw string rather than a template, `ssr` rendered
    // nothing, `hasPart` answered false, and the test passed while proving
    // nothing at all.
    expect(hasPart(ssr(nest), 'separator')).toBe(true)
    expect(hasPart(ssr(nest), 'corner')).toBe(false)
  })
})

describe('splitter collapsing on a server', () => {
  test('a pane declared shut is already shut in the markup', () => {
    // The geometry lives on the pane in this shadow root, so the server can
    // write it and nothing moves on hydration.
    expect(partTag(ssr(shut), 'start')).toContain('0%')
  })

  test('the divider reports the shut position, not the seed underneath it', () => {
    expect(partTag(ssr(shut), 'separator')).toContain('aria-valuenow="0"')
  })

  test('the host still carries only what the consumer wrote', () => {
    // `data-collapsed` is mirrored once the element upgrades, never served.
    expect(hostAttributes(ssr(shut), 'helix-base-splitter')).toEqual([
      'default-collapsed',
      'default-position',
    ])
  })
})
