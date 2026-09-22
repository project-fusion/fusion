import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const clip = html`<helix-video label="A clip" poster="/still.jpg" src="/clip.mp4"></helix-video>`

/* What a reader gets before a line of script has run, which for this component
   is nearly all of it.
 *
 * **This file used to be the boilerplate written for a family's parts**, a
 * `toContain` of the tag name against `withoutStyles`, and that assertion cannot
 * fail: what `withoutStyles` leaves behind opens with the host's own tag, so the
 * string it is looking for is the consumer's markup echoed back. The largest
 * component in the library, and the one with the most to say about its server
 * output, had a server spec that said nothing about it and would have gone on
 * passing if the whole template had been deleted. That boilerplate belongs on a
 * part whose own markup is the root's business; this is the root. */
describe('video server output', () => {
  test('the picture is a real `<video>`, with its source and its poster on it', () => {
    /* Which is the whole promise of the component: decoding, buffering and the
       still are the platform's, so a reader with no script yet has the frame the
       consumer chose rather than an empty box waiting to be told what to show. */
    const video = partTag(ssr(clip), 'video')
    expect(video).toContain('src="/clip.mp4"')
    expect(video).toContain('poster="/still.jpg"')
    expect(video).toContain('preload="metadata"')
  })

  test('and is named there, since the name is a property and not a file name', () => {
    expect(partTag(ssr(clip), 'video')).toContain('aria-label="A clip"')
    expect(partTag(ssr(clip), 'stage')).toContain('aria-label="A clip"')
  })

  test('the bar is served whole, so nothing about the player arrives late', () => {
    /* The frame rather than the reading, which is the same answer a chart gives.
       A bar that filled in after hydration would move everything under it, and
       the numbers in it are all zero until the metadata lands, which is a fact
       about the media rather than about the render. */
    expect(servedParts(ssr(clip))).toEqual([
      'controls',
      'fullscreen',
      'header',
      'mute',
      'play',
      'poster',
      'scrubber',
      'sound',
      'stage',
      'start',
      'time',
      'video',
      'volume',
    ])
  })

  test('the controls a platform has to be asked about are not among them', () => {
    /* `pip` and `remote` are the two the server cannot answer for: one asks
       `document.pictureInPictureEnabled` and the other waits on
       `watchAvailability`, and a server has neither. Named here because the
       alternative is a control served and then taken away, which is worse than
       one that arrives. */
    const asked = html`<helix-video
      extra-controls="pip remote download"
      src="/clip.mp4"
    ></helix-video>`
    expect(hasPart(ssr(asked), 'pip')).toBe(false)
    expect(hasPart(ssr(asked), 'remote')).toBe(false)
    expect(hasPart(ssr(asked), 'download')).toBe(true)
  })

  test('the native bar replaces ours rather than joining it', () => {
    /* Two play buttons is the failure, and it is a first-paint one: the browser
       draws its own bar from the attribute with no script at all. */
    const native = html`<helix-video controls src="/clip.mp4"></helix-video>`
    expect(hasPart(ssr(native), 'controls')).toBe(false)
    expect(hasPart(ssr(native), 'start')).toBe(false)
    expect(partTag(ssr(native), 'video')).toContain('controls')
  })

  test('the host declares nothing of its own beyond a `data-` mirror', () => {
    /* An element writing its own bookkeeping onto itself is markup the server
       never sent, which React reports as a hydration mismatch and a copy-paste
       re-parses as a declaration. */
    const written = hostAttributes(ssr(clip), 'helix-video')
    expect(written.filter((one) => !one.startsWith('data-'))).toEqual(['label', 'poster', 'src'])
  })
})
