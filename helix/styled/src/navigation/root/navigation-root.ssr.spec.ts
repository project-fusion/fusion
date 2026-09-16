import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('navigation server output', () => {
  const served = ssr(
    html`<helix-navigation label="Sections">
      <a aria-current="page" href="/one">One</a>
      <a href="/two">Two</a>
    </helix-navigation>`,
  )
  const markup = withoutStyles(served)

  test('the landmark is served with its name, and the links are projected into it', () => {
    expect(partTag(markup, 'nav')).toMatch(/^<nav\s/)
    expect(partTag(markup, 'nav')).toContain('aria-label="Sections"')
    /* `toContain('href="/one"')` passed on the spec's own `<a>`, which sits in
       the host's light DOM and reaches a crawler whatever the component
       renders. The claim is the unnamed slot inside the landmark: that is what
       puts the links in the `<nav>` rather than beside it. */
    expect(rendered(markup, 'helix-navigation')).toMatch(/<slot\s*><\/slot>\s*<\/nav>/)
  })

  test('the marker ships unplaced, since a server cannot measure', () => {
    // It is placed once the client can lay out, and until then the current
    // destination is legible from its own weight.
    expect(partTag(markup, 'indicator')).toContain('aria-hidden="true"')
    expect(partTag(markup, 'indicator')).not.toContain('data-placed')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-navigation')).toEqual(['label'])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(rendered(markup, 'helix-navigation')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--navigation-indicator-color')
  })
})
