import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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

describe('video', () => {
  test('the picture is a real video element', async () => {
    /* Decoding, buffering, captions, Picture in Picture and whatever codecs a
       device happens to have are all the platform's, and none of them can be
       had from anything else. */
    const host = await player()
    expect((part(host, 'video') as HTMLElement).tagName).toBe('VIDEO')
  })

  test('the bar this library draws, not the browser"s', async () => {
    const host = await player()
    expect(part(host, 'controls')).not.toBeNull()
    expect((part(host, 'video') as HTMLVideoElement).controls).toBe(false)
  })

  test('and the browser"s instead when it was asked for', async () => {
    // Two bars over one video is worse than either alone, and a consumer who
    // asked for the native one has a reason.
    const host = await player('<helix-video controls label="A clip" src="/clip.mp4"></helix-video>')
    expect((part(host, 'video') as HTMLVideoElement).controls).toBe(true)
    expect(part(host, 'controls')).toBeNull()
  })

  test('the scrubber and the volume are real ranges', async () => {
    /* Which is what gives a reader the arrows, Home and End, the platform's own
       touch target and its screen reader announcement, none of it implemented
       here. Drawing a div and listening for pointer moves is how a player ends
       up unusable from a keyboard. */
    for (const name of ['scrubber', 'volume']) {
      const host = await player()
      const control = part(host, name) as HTMLInputElement
      expect(control.tagName).toBe('INPUT')
      expect(control.type).toBe('range')
      expect(control.getAttribute('aria-label')).not.toBe(null)
    }
  })

  test('the native controls keep their own keyboard, and their own focus', async () => {
    /* Two handlers on one press is a video that seeks twice, or plays and
       immediately pauses. A consumer who asked for the browser's bar asked for
       its keyboard with it, and it brings its own focus stop. */
    const host = await player('<helix-video controls label="A clip" src="/clip.mp4"></helix-video>')
    const stage = part(host, 'stage') as HTMLElement
    expect(stage.hasAttribute('tabindex')).toBe(false)
    expect(stage.hasAttribute('role')).toBe(false)

    const video = part(host, 'video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    stage.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    )
    expect(video.currentTime).toBe(0)
  })

  test('there is one focus stop, and it is the picture', async () => {
    /* A video with no native controls is not focusable, and the buttons under
       it are, so without this a reader could reach Play and never the thing the
       keys are about. */
    const host = await player()
    const stage = part(host, 'stage') as HTMLElement
    expect(stage.getAttribute('tabindex')).toBe('0')
    expect(stage.getAttribute('role')).toBe('group')
    expect(stage.getAttribute('aria-label')).toBe('A clip')
  })

  test('the play control renames itself, because they are two actions', async () => {
    const host = await player()
    expect((part(host, 'play') as HTMLElement).getAttribute('aria-label')).toBe('Play')
  })

  test('mute and fullscreen are toggles, and report their state', async () => {
    // A toggle keeps one name and says what it is in `aria-pressed`, which is
    // the opposite of the play control and right for the same reason.
    const host = await player()
    for (const name of ['mute', 'fullscreen']) {
      expect((part(host, name) as HTMLElement).getAttribute('aria-pressed')).toBe('false')
    }
  })

  test('captions are offered only where there are captions', async () => {
    const host = await player()
    expect(part(host, 'captions')).toBeNull()
  })

  test('the clock drops an hour it does not have', async () => {
    // `0:42`, not `00:00:42`. A reader comparing position to duration reads two
    // numbers at a glance, and leading zeroes that never change are digits in
    // the way of the ones that do.
    const host = await player()
    expect((part(host, 'time') as HTMLElement).textContent?.trim()).toBe('0:00 / 0:00')
  })
})

if (hasLayout()) {
  describe('video, once a real engine is behind it', () => {
    test('play, pause and ended are relayed out of the shadow root', async () => {
      /* The video is inside this element, so a consumer listening on the
         element they wrote hears nothing at all without the relay. Input relays
         `change` for the same reason. */
      const host = await player()
      const heard: string[] = []
      for (const name of ['play', 'pause', 'ended']) {
        host.addEventListener(name, () => heard.push(name))
      }
      const video = part(host, 'video') as HTMLVideoElement
      for (const name of ['play', 'pause', 'ended']) {
        video.dispatchEvent(new Event(name))
      }
      await host.updateComplete
      expect(heard).toEqual(['play', 'pause', 'ended'])
    })

    test('the keys move the video, and leave the ranges alone', async () => {
      /* The arrows already belong to a range, so taking them there would seek
         twice for one press. */
      const host = await player()
      const video = part(host, 'video') as HTMLVideoElement
      Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
      const stage = part(host, 'stage') as HTMLElement

      stage.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
      )
      expect(video.currentTime).toBeGreaterThan(0)

      const before = video.currentTime
      const scrubber = part(host, 'scrubber') as HTMLInputElement
      scrubber.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
      )
      expect(video.currentTime).toBe(before)
    })

    test('the box is the video"s shape before the video has said what it is', async () => {
      /* A `<video>` is 300 by 150 until its metadata arrives, which is the
         default every replaced element starts at. At 480 wide the box was 150
         tall where the frames wanted 270, and the poster is painted into that
         box: it came out letterboxed and half the height of the video that
         replaced it a moment later. It is also a layout shift, over exactly the
         interval a poster is shown for. */
      const host = await player()
      const video = part(host, 'video') as HTMLVideoElement
      const ratio = getComputedStyle(video).aspectRatio
      expect(ratio.startsWith('auto')).toBe(true)
      expect(ratio).toContain('16 / 9')
    })

    test('and whatever fills it is fitted the same way', async () => {
      // So a poster and a frame cannot disagree, even where a consumer's ratio
      // and their file's do.
      const host = await player()
      expect(getComputedStyle(part(host, 'video') as HTMLElement).objectFit).toBe('contain')
    })

    test('playback is on the host, because CSS cannot ask a video', async () => {
      /* `paused` is a property and never an attribute, so `video:not([paused])`
         matched every video in existence: the rule that hides the bar while
         playing hid it always, including on a paused video, which is the one
         state it exists to keep it visible in. */
      const host = await player()
      expect(host.hasAttribute('data-playing')).toBe(false)

      const video = part(host, 'video') as HTMLVideoElement
      video.dispatchEvent(new Event('play'))
      await (host as Player).updateComplete
      expect(host.hasAttribute('data-playing')).toBe(true)

      video.dispatchEvent(new Event('pause'))
      await (host as Player).updateComplete
      expect(host.hasAttribute('data-playing')).toBe(false)
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

    test('seeking is clamped to what exists', async () => {
      const host = await player()
      const video = part(host, 'video') as HTMLVideoElement
      Object.defineProperty(video, 'duration', { configurable: true, value: 10 })
      ;(host as unknown as { seek: (seconds: number) => void }).seek(500)
      expect(video.currentTime).toBe(10)
      ;(host as unknown as { seek: (seconds: number) => void }).seek(-5)
      expect(video.currentTime).toBe(0)
    })
  })
}
