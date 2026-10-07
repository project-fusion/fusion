import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* The headless menu on a server: its trigger is served and named, so the
   control bar is whole before hydration, and the entries, which are the
   playlist's light DOM, arrive on the client. */
describe('headless video playlist menu server output', () => {
  test('serves its trigger, named, and says it opens a menu', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-menu label="Camera angles"></helix-headless-video-playlist-menu>`,
    )
    expect(hasPart(markup, 'trigger')).toBe(true)
    const own = rendered(markup, 'helix-headless-video-playlist-menu')
    expect(own).toContain('aria-label="Camera angles"')
    expect(own).toContain('aria-haspopup="menu"')
    expect(own).toContain('aria-expanded="false"')
  })

  test('serves no entries, which only the client can find', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-menu></helix-headless-video-playlist-menu>`,
    )
    expect(markup).not.toContain('part="entry"')
  })

  test('writes nothing onto the host that the consumer did not write', () => {
    const markup = ssr(
      html`<helix-headless-video-playlist-menu label="Camera angles"></helix-headless-video-playlist-menu>`,
    )
    expect(hostAttributes(markup, 'helix-headless-video-playlist-menu')).toEqual(['label'])
  })
})
