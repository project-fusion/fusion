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

describe('the mark that starts it', () => {
  test('a stopped video has one, because nothing else in it invites a press', async () => {
    /* Measured on the bar before this existed: the play glyph is 16 by 16 in a
       24 by 24 target, 0.12% of a 528 by 396 picture. What a reader meets is a
       still frame with some chrome along the bottom. */
    const host = await player()
    expect(part(host, 'start')).not.toBeNull()
  })

  test('and `none` is for a video that is decoration rather than something to start', async () => {
    const host = await player(
      '<helix-video label="A clip" src="/clip.mp4" start-control="none"></helix-video>',
    )
    expect(part(host, 'start')).toBeNull()
  })

  test('the browser drawing its own controls takes it away too', async () => {
    // That bar has a play button in it, and two would be two.
    const host = await player('<helix-video controls label="A clip" src="/clip.mp4"></helix-video>')
    expect(part(host, 'start')).toBeNull()
  })

  test('it goes while playing and comes back on pause', async () => {
    /* Whenever it is not playing, which is what the mark means: press this to
       play. It said that only before the first play, which made it mean two
       different things at two moments that are the same state. */
    const host = await player()
    const video = part(host, 'video') as HTMLVideoElement
    expect(part(host, 'start')).not.toBeNull()

    // `paused` is readonly, here and in a browser: it follows the resource
    // rather than being set, so the state it reports has to be stood in for.
    const pausedAs = (value: boolean) => {
      Object.defineProperty(video, 'paused', { configurable: true, value })
    }

    pausedAs(false)
    video.dispatchEvent(new Event('play'))
    await host.updateComplete
    expect(part(host, 'start')).toBeNull()

    pausedAs(true)
    video.dispatchEvent(new Event('pause'))
    await host.updateComplete
    expect(part(host, 'start')).not.toBeNull()
  })
})

describe('the download control', () => {
  test('claims nothing it cannot do, and does not take the page with it', async () => {
    /* `download` is honoured for a same-origin file and ignored for any other,
       whatever headers come back. Measured on a cross-origin clip: the press
       navigated the whole page to the mp4, which reads as the player
       disappearing. An attribute the browser will ignore is a lie in the
       markup, so it is written only when it holds, and a new tab is the best a
       page can do with somebody else's file. */
    const away = await player(
      '<helix-video extra-controls="download" label="A clip" src="https://example.com/clip.mp4"></helix-video>',
    )
    const link = part(away, 'download') as HTMLAnchorElement
    expect(link.hasAttribute('download')).toBe(false)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
  })

  test('and asks for a save where the file is ours', async () => {
    /* A `blob:` source, which is ours by definition and needs no origin to
       compare against. That matters here because these specs run in two places:
       happy-dom serves every document from `about:blank`, whose origin is the
       string `null`, so a relative path resolves to nothing there while
       resolving perfectly in the browser run. An assertion about the
       environment passes in one and fails in the other, which is what the first
       version of this did. */
    const ours = await player(
      '<helix-video extra-controls="download" label="A clip" src="blob:whatever"></helix-video>',
    )
    const link = part(ours, 'download') as HTMLAnchorElement
    expect(link.hasAttribute('download')).toBe(true)
    expect(link.hasAttribute('target')).toBe(false)
  })
})

describe('asking for another item in a set', () => {
  const skipper = async () =>
    player(
      '<helix-video extra-controls="previous next" label="A clip" src="/clip.mp4"></helix-video>',
    )

  test('both controls are offered without anything being checked', async () => {
    /* Neither does anything to the video, so there is nothing to feature-test.
       A player that hid them until it could prove a set existed would be a
       player that cannot know: a `<video>` plays one resource. */
    const host = await skipper()
    expect(part(host, 'previous')).not.toBeNull()
    expect(part(host, 'next')).not.toBeNull()
  })

  test('and pressing one announces, rather than doing anything', async () => {
    const host = await skipper()
    const heard: string[] = []
    host.addEventListener('helix-next', (event) => {
      heard.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    host.addEventListener('helix-previous', (event) => {
      heard.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    ;(part(host, 'next') as HTMLElement).click()
    ;(part(host, 'previous') as HTMLElement).click()
    expect(heard).toEqual(['next', 'previous'])
  })

  test('the events bubble and are composed, so a wrapper can answer them', async () => {
    // What comes next is a playlist's business, and a playlist is outside.
    const host = await skipper()
    let seen: Event | undefined
    document.addEventListener('helix-next', (event) => {
      seen = event
    })
    ;(part(host, 'next') as HTMLElement).click()
    expect(seen?.bubbles).toBe(true)
    expect(seen?.composed).toBe(true)
    expect(seen?.cancelable).toBe(false)
  })
})

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

  test('remote is offered only once something answers, not merely where supported', async () => {
    /* A button that opens an empty device list is worse than no button. The
       platform answers `watchAvailability` late and often with nothing, so the
       control waits for an actual target rather than for the API to exist. */
    const host = await player(
      '<helix-video extra-controls="remote" label="A clip" src="/clip.mp4"></helix-video>',
    )
    expect(part(host, 'remote')).toBeNull()
  })

  test('the page"s media session goes to whichever player was started last', async () => {
    /* There is one session per page and it decides where a headset's buttons
       land, so two players cannot both hold it. Render order is the wrong rule:
       a reader pressing play on their headphones means the one they started. */
    const session = navigator.mediaSession
    if (!session) {
      return
    }
    const first = await player('<helix-video label="First" src="/a.mp4"></helix-video>')
    const second = await player('<helix-video label="Second" src="/b.mp4"></helix-video>')

    ;(part(first, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (first as Player).updateComplete
    expect(session.metadata?.title).toBe('First')

    ;(part(second, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (second as Player).updateComplete
    expect(session.metadata?.title).toBe('Second')
  })

  test('and a player that lost it does not clear it on the way out', async () => {
    // Leaving the document hands the session back only if this element still
    // holds it, or a stale player wipes the live one's metadata.
    const session = navigator.mediaSession
    if (!session) {
      return
    }
    const first = await player('<helix-video label="First" src="/a.mp4"></helix-video>')
    ;(part(first, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (first as Player).updateComplete

    const second = await player('<helix-video label="Second" src="/b.mp4"></helix-video>')
    ;(part(second, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (second as Player).updateComplete

    first.remove()
    expect(session.metadata?.title).toBe('Second')
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
