import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../../index.js'

const markup = ssr(html`<helix-sandbox>
  <helix-sandbox-source slot="source" value="<p>one</p>"></helix-sandbox-source>
  <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
</helix-sandbox>`)

describe('sandbox server output', () => {
  test('renders without reading children it cannot see', () => {
    // The coordination listener is attached on connect, which the server never
    // calls, so rendering at all proves nothing walks the tree.
    // The host is the split, so there is no container part: the shadow root
    // holds two panes and the divider between them.
    expect(hasPart(markup, 'pane')).toBe(true)
    expect(hasPart(markup, 'separator')).toBe(true)
  })

  test('the divider ships with its full state, not just a role', () => {
    const separator = partTag(markup, 'separator')
    expect(separator).toContain('role="separator"')
    // A position, whatever the default is. Pinning the number made a change of
    // default read as a divider that had stopped reporting itself.
    expect(separator).toMatch(/aria-valuenow="\d+"/)
    // 0, not the fifteen a drag stops at: past that floor the pane closes, so
    // nothing is a position a reader can reach and the range has to say so.
    expect(separator).toContain('aria-valuemin="0"')
    expect(separator).toContain('aria-valuemax="100"')
    expect(separator).toContain('tabindex="0"')
  })

  test('the source pane is a labelled textarea in the served markup', () => {
    expect(partTag(markup, 'source')).toContain('aria-label="Example source"')
    expect(withoutStyles(markup)).toContain('<textarea')
  })

  test('the served split matches the property default, so nothing shifts', () => {
    // The split cannot be an inline style: that is an attribute the element
    // would give itself on upgrade, which a React consumer's markup never has.
    // It is set from a `<style>` in the shadow root instead, and the stylesheet
    // carries the same figure as a fallback so the served markup already
    // agrees.
    //
    // Read from what was served rather than written here twice. The invariant
    // is that the two agree, and a spec naming the number states the default in
    // a third place that then has to be kept in step with the other two.
    const served = /aria-valuenow="(\d+)"/.exec(partTag(markup, 'separator') ?? '')?.[1]
    expect(served).toBeDefined()
    expect(markup).toContain(`var(--_sandbox-split, ${served}%)`)
  })
})
