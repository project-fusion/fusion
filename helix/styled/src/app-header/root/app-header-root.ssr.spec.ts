import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, hostTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('app header server output', () => {
  const markup = ssr(html`
    <helix-app-header>
      <span slot="start">Fusion</span>
      <a href="/work">Work</a>
    </helix-app-header>
  `)

  test('renders without reaching for a window it does not have', () => {
    // The scroll listener is attached on connect, which the server never calls,
    // so rendering here proves the element does not touch `window` to render.
    expect(markup).toContain('<helix-app-header')
    expect(hostAttributes(markup, 'helix-app-header')).toEqual([])
    expect(withoutStyles(markup)).toContain('<slot name="start">')
    // The banner is full width and the row inside it is what centers.
    expect(hasPart(markup, 'content')).toBe(true)
  })

  test('ships un-scrolled, which is what a fresh load shows', () => {
    // If the bar arrived with its scrolled treatment, it would settle visibly
    // on hydration. Absent is the correct starting state.
    expect(hostTag(markup, 'helix-app-header')).not.toContain('data-scrolled')
  })

  test('navigation is in the markup for a crawler with no JavaScript', () => {
    expect(withoutStyles(markup)).toContain('href="/work"')
  })

  test('declarative shadow DOM carries the material', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-material-translucent')
  })
})
