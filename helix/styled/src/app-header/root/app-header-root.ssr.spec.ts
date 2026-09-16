import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  hostTag,
  rendered,
  servedParts,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('app header server output', () => {
  const served = ssr(html`
    <helix-app-header>
      <span slot="start">Fusion</span>
      <a href="/work">Work</a>
    </helix-app-header>
  `)
  const markup = withoutStyles(served)

  test('renders without reaching for a window it does not have', () => {
    // The scroll listener is attached on connect, which the server never calls,
    // so rendering here proves the element does not touch `window` to render.
    /* The served frame rather than `toContain('<helix-app-header')`, which was
       the consumer's own opening tag echoed back and would have passed with
       nothing rendered at all. The banner is full width and the row inside it
       is what centers. */
    expect(servedParts(markup)).toEqual(['content', 'end', 'row', 'start'])
    expect(hostAttributes(markup, 'helix-app-header')).toEqual([])
    expect(rendered(markup, 'helix-app-header')).toContain('<slot name="start">')
  })

  test('ships un-scrolled, which is what a fresh load shows', () => {
    // If the bar arrived with its scrolled treatment, it would settle visibly
    // on hydration. Absent is the correct starting state.
    expect(hostTag(markup, 'helix-app-header')).not.toContain('data-scrolled')
  })

  test('the navigation a consumer writes is projected, not rebuilt on the client', () => {
    /* `toContain('href="/work"')` passed on the spec's own `<a>`, which sits in
       the host's light DOM and is in the response whatever the header renders.
       What the header owes a crawler is the unnamed slot that projects it, read
       off a render with no children so the only shadow root here is its own. */
    const bare = ssr(html`<helix-app-header></helix-app-header>`)
    expect(rendered(bare, 'helix-app-header')).toContain('<div part="content"><slot></slot></div>')
  })

  test('declarative shadow DOM carries the material', () => {
    expect(rendered(markup, 'helix-app-header')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--helix-material-translucent')
  })
})
