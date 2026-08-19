import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('video playlist server output', () => {
  test('both regions are served, so the player is not a gap that fills in', () => {
    const markup = withoutStyles(
      ssr(html`<helix-video-playlist label="Episodes">
      <helix-video label="Player" slot="player"></helix-video>
    </helix-video-playlist>`),
    )
    expect(hasPart(markup, 'player')).toBe(true)
    expect(hasPart(markup, 'items')).toBe(true)
  })

  test('the list is named on the server, since the name is a property', () => {
    const markup = withoutStyles(
      ssr(html`<helix-video-playlist label="Episodes"></helix-video-playlist>`),
    )
    expect(markup).toContain('aria-label="Episodes"')
  })

  test('the host carries nothing the consumer did not write', () => {
    /* Nothing here reflects. Which entry is current is state, and the rule the
       value mixins record applies: an attribute is the declaration and the
       property is the state, so writing it back would make a copied host come
       back controlled and frozen. */
    const markup = ssr(html`<helix-video-playlist
      default-active="one"
      label="Episodes"
    ></helix-video-playlist>`)
    expect(hostAttributes(markup, 'helix-video-playlist')).toEqual(['default-active', 'label'])
  })
})
