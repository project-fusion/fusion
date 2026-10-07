import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* A headless entry on a server: the list item and its button are served, so the
   list has its rows before a script runs, and no entry claims to be the one
   playing, which only the browser knows. */
describe('headless video playlist item server output', () => {
  test('serves the list item, its button, and the thumbnail of its poster', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-item poster="/one.jpg" src="/one.mp4" value="one">One</helix-headless-video-playlist-item>`,
    )
    expect(hasPart(markup, 'container')).toBe(true)
    expect(hasPart(markup, 'thumbnail')).toBe(true)
    const own = rendered(markup, 'helix-headless-video-playlist-item')
    expect(own).toContain('role="listitem"')
    expect(own).toContain('<button')
    expect(own).not.toContain('aria-current')
  })

  test('serves a disabled entry as a disabled button', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-item disabled value="one">One</helix-headless-video-playlist-item>`,
    )
    expect(rendered(markup, 'helix-headless-video-playlist-item')).toMatch(/<button[^>]*disabled/)
  })

  test('writes nothing onto the host that the consumer did not write', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>`,
    )
    expect(hostAttributes(markup, 'helix-headless-video-playlist-item')).toEqual(['src', 'value'])
  })
})
