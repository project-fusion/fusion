import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* The headless playlist on a server: both regions served, the list named, and
   the entries left as the consumer wrote them, since which one is current is
   only known in the browser. */
describe('headless video playlist server output', () => {
  test('serves the player region and the named list', () => {
    const markup = ssr(html`<helix-headless-video-playlist label="Episodes">
      <helix-headless-video label="Player" slot="player"></helix-headless-video>
      <helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
    </helix-headless-video-playlist>`)
    expect(hasPart(markup, 'player')).toBe(true)
    expect(hasPart(markup, 'items')).toBe(true)
    expect(rendered(markup, 'helix-headless-video-playlist')).toContain('aria-label="Episodes"')
  })

  test('writes nothing onto the hosts that the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-video-playlist default-active="one" label="Episodes">
      <helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
    </helix-headless-video-playlist>`)
    expect(hostAttributes(markup, 'helix-headless-video-playlist')).toEqual([
      'default-active',
      'label',
    ])
    expect(hostAttributes(markup, 'helix-headless-video-playlist-item')).toEqual(['src', 'value'])
  })
})
