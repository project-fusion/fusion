import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('video playlist menu server output', () => {
  test('serves its trigger, so the control bar is not one button short until hydration', () => {
    const markup = withoutStyles(ssr(html`<helix-video-playlist-menu></helix-video-playlist-menu>`))
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('serves no entries, which is the honest answer on a server', () => {
    /* The entries are the playlist's light DOM, and the server has no tree to
       walk: `closestInstance` needs a parent chain that does not exist there.
       So the menu renders empty and fills in on the client, which is why the
       trigger above is the part that has to be served. Asserting this rather
       than leaving it undefined, because the failure it guards against is a
       component that reaches for the DOM during SSR and throws. */
    const markup = withoutStyles(ssr(html`<helix-video-playlist-menu></helix-video-playlist-menu>`))
    expect(markup).not.toContain('part="entry"')
  })

  test('names the trigger on the server, since the name is a property', () => {
    const markup = withoutStyles(
      ssr(html`<helix-video-playlist-menu label="Camera angles"></helix-video-playlist-menu>`),
    )
    expect(rendered(markup, 'helix-video-playlist-menu')).toContain('aria-label="Camera angles"')
  })
})
