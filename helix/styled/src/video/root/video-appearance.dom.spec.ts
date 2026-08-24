import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Player = HTMLElement & { updateComplete: Promise<boolean> }

const player = async (markup = '<helix-video label="A clip" src="/clip.mp4"></helix-video>') => {
  const host = (await mount(markup)) as Player
  await host.updateComplete
  return host
}

/* What the stylesheet does to the picture, which is the half of Video that
   stays on this tier. Everything the element does, the events it relays, the
   keys it answers, the state it writes, is the headless element's and is tested
   there.

   Browser only, because every assertion here is a computed value and happy-dom
   resolves none of them. */
if (hasLayout()) {
  describe('video, as the stylesheet leaves it', () => {
    test('the box is the video"s shape before the video has said what it is', async () => {
      /* A `<video>` is 300 by 150 until its metadata arrives, which is the
         default every replaced element starts at. At 480 wide the box was 150
         tall where the frames wanted 270, and the poster is painted into that
         box: it came out letterboxed and half the height of the video that
         replaced it a moment later. It is also a layout shift, over exactly the
         interval a poster is shown for.

         **Sixteen by nine, and deliberately not `auto 16 / 9`**, which is what
         this asserted while never running. `auto` takes the element's intrinsic
         ratio, and a video carrying a poster reports the *poster's*, so the box
         took the still's shape and the clip letterboxed inside it. The element
         writes `--video-intrinsic-ratio` from `videoWidth` and `videoHeight` instead,
         which is the only source that is always the video. */
      const host = await player()
      const video = part(host, 'video') as HTMLVideoElement
      expect(getComputedStyle(video).aspectRatio).toBe('16 / 9')

      // And it follows the real one the moment the element knows it.
      ;(host as HTMLElement).style.setProperty('--video-intrinsic-ratio', '4 / 3')
      expect(getComputedStyle(video).aspectRatio).toBe('4 / 3')
    })

    test('and whatever fills it is fitted the same way', async () => {
      // So a poster and a frame cannot disagree, even where a consumer's ratio
      // and their file's do.
      const host = await player()
      expect(getComputedStyle(part(host, 'video') as HTMLElement).objectFit).toBe('contain')
    })

    test('the well is dark in both modes, and so is the ink on the bar', async () => {
      /* `surface-inverse` looks like the token for this and is not: it is
         near-white in dark mode, so the well came out white on a black page and
         took the bar's light ink with it. Media sits in a dark well everywhere
         it has ever been shown. */
      const host = await player()
      const well = getComputedStyle(part(host, 'video') as HTMLElement).backgroundColor
      const ink = getComputedStyle(part(host, 'controls') as HTMLElement).color
      expect(well).not.toBe(ink)
      expect(well).toBe('oklch(0 0 0)')
    })
  })
}
