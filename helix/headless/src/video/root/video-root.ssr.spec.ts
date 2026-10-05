import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const clip = html`<helix-headless-video label="A clip" src="/clip.mp4"></helix-headless-video>`

/* The playback attributes are the component's whole contribution to the first
   paint, and every one of them fails quietly.
 *
 * A `<video>` inside a shadow root is reached by nothing a consumer writes:
 * they cannot select it, the platform reads these off the element rather than
 * off the host, and a binding that stopped forwarding leaves a player that
 * looks identical and behaves like a default one. The properties still read
 * back whatever was set, so nothing anywhere says the request was dropped. */
describe('video playback attributes', () => {
  test('the muting pair reaches the media element, which is what an autoplay depends on', () => {
    /* `muted` and `autoplay` are one decision rather than two: every browser
       refuses to start a clip with sound and starts a silent one, so an
       `autoplay` that arrived without its `muted` is an autoplay that never
       runs. `defaultMuted` is the property spelling, because `muted` alone is
       the live state a reader's volume press moves.

       Both are served rather than set at hydration, since a browser decides
       whether to start the moment it parses the element. */
    const silent = html`<helix-headless-video
      autoplay
      loop
      muted
      src="/clip.mp4"
    ></helix-headless-video>`
    const video = partTag(ssr(silent), 'video')
    expect(video).toContain('autoplay')
    expect(video).toContain('muted')
    expect(video).toContain('loop')
  })

  test('a player nobody asked to start carries none of the three', () => {
    /* The resting state is the absence of each attribute, and each of them is a
       boolean the platform acts on from its presence alone: a `loop` written at
       its own default is a clip that never ends. */
    const video = partTag(ssr(clip), 'video')
    expect(video).not.toContain('autoplay')
    expect(video).not.toContain('muted')
    expect(video).not.toContain('loop')
  })

  test('plays-inline is served, since the alternative is a phone taking the screen', () => {
    /* Defaulted to true here and the platform's default is the opposite, so
       this is the one in the group whose *presence* is the departure from the
       browser. Dropped, an iPhone opens the clip full screen over whatever the
       reader was reading, on the first tap and with no way back except its own
       Done button. */
    expect(partTag(ssr(clip), 'video')).toContain('playsinline')

    const takeover = html`<helix-headless-video src="/clip.mp4" .playsInline=${false}></helix-headless-video>`
    expect(partTag(ssr(takeover), 'video')).not.toContain('playsinline')
  })

  test('the two refusals reach the media element rather than the host', () => {
    /* A picture-in-picture window and a cast target are both started by the
       browser's own chrome, which reads these off the `<video>` and never looks
       at an ancestor. Written on the host they would be two attributes doing
       nothing at all. */
    const held = html`<helix-headless-video
      disablepictureinpicture
      disableremoteplayback
      src="/clip.mp4"
    ></helix-headless-video>`
    const video = partTag(ssr(held), 'video')
    expect(video).toContain('disablepictureinpicture')
    expect(video).toContain('disableremoteplayback')
  })

  test('the cross-origin policy reaches the media element, where the request is made', () => {
    /* It decides whether the text tracks on another host load at all, and
       whether a frame can be drawn to a canvas. Absent by default rather than
       empty: `crossorigin=""` is the anonymous mode, which is a different
       request from the one a consumer who set nothing asked for. */
    const cdn = html`<helix-headless-video
      crossorigin="use-credentials"
      src="https://cdn.example/clip.mp4"
    ></helix-headless-video>`
    expect(partTag(ssr(cdn), 'video')).toContain('crossorigin="use-credentials"')
    expect(partTag(ssr(clip), 'video')).not.toContain('crossorigin')
  })
})

describe('video control names on the server', () => {
  test('the start mark is named with the word the consumer chose', () => {
    /* Its only content is a glyph, so this is the whole accessible name. A
       word the component does not already hold, because `playLabel` defaults to
       "Play" and asserting that would pass against a template writing the
       literal. */
    const named = html`<helix-headless-video
      play-label="Start the clip"
      src="/clip.mp4"
    ></helix-headless-video>`
    expect(partTag(ssr(named), 'start')).toContain('aria-label="Start the clip"')
    expect(partTag(ssr(named), 'play')).toContain('aria-label="Start the clip"')
  })
})

describe('the player on the server', () => {
  test('is named by `player-label` where there is no `label`', () => {
    /* A literal "Video" before, so a page in another language was served an
       English name for the group the keys are bound to. */
    const unnamed = html`<helix-headless-video player-label="Vidéo" src="/clip.mp4"></helix-headless-video>`
    expect(partTag(ssr(unnamed), 'stage')).toContain('aria-label="Vidéo"')
    const plain = html`<helix-headless-video src="/clip.mp4"></helix-headless-video>`
    expect(partTag(ssr(plain), 'stage')).toContain('aria-label="Video"')
  })

  test('serves one Play a keyboard can reach', () => {
    const start = partTag(ssr(clip), 'start')
    expect(start).toContain('tabindex="-1"')
    expect(start).toContain('aria-hidden="true"')
    expect(partTag(ssr(clip), 'play')).not.toContain('aria-hidden')
  })

  test('serves each glyph inside the slot that replaces it', () => {
    /* A slot a consumer fills on the server's markup has to be there before
       hydration, or the icon set arrives late and the drawn glyph flashes. */
    const shadow = rendered(ssr(clip), 'helix-headless-video')
    for (const name of ['start-icon', 'play-icon', 'volume-icon', 'fullscreen-icon']) {
      expect(shadow).toMatch(new RegExp(`<slot\\s+name="${name}"[^>]*>(<!--[^>]*-->|\\s)*<svg`))
    }
  })
})
