import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Player = HTMLElement & { updateComplete: Promise<boolean> }

const player = async (
  markup = '<helix-headless-video label="A clip" src="/clip.mp4"></helix-headless-video>',
) => {
  const host = (await mount(markup)) as Player
  await host.updateComplete
  return host
}

describe('waiting for the picture', () => {
  /* `paused` is defined rather than played for real, because whether a browser
     decodes a file is not what is under test: which events this element listens
     to is. */
  const media = async (): Promise<{ host: Player; video: HTMLVideoElement }> => {
    const host = await player()
    const video = host.shadowRoot?.querySelector('video') as HTMLVideoElement
    return { host, video }
  }

  test('a stall says so, and the start mark gets out of its way', async () => {
    /* The case this covers is the one that looks like a bug: a picture frozen
       mid-play with the scrubber stopped and nothing on screen saying why. */
    const { host, video } = await media()
    Object.defineProperty(video, 'paused', { configurable: true, value: false })
    video.dispatchEvent(new Event('play'))
    await host.updateComplete

    video.dispatchEvent(new Event('waiting'))
    await host.updateComplete
    expect(part(host, 'loading')).not.toBeNull()
    expect(part(host, 'start')).toBeNull()
  })

  test('and it is a live region, for the reader who cannot see it spin', async () => {
    const { host, video } = await media()
    video.dispatchEvent(new Event('waiting'))
    await host.updateComplete
    const said = part(host, 'loading') as HTMLElement
    expect(said.getAttribute('role')).toBe('status')
    expect(said.getAttribute('aria-live')).toBe('polite')
    expect(said.textContent?.trim()).toContain('Loading')
  })

  test('the frame moving again takes it away', async () => {
    const { host, video } = await media()
    video.dispatchEvent(new Event('waiting'))
    await host.updateComplete
    expect(part(host, 'loading')).not.toBeNull()

    video.dispatchEvent(new Event('playing'))
    await host.updateComplete
    expect(part(host, 'loading')).toBeNull()
  })

  test('a source that will not play says that instead, and says it loudly', async () => {
    /* `alert` rather than `status`: nothing further is going to happen, and a
       reader waiting politely for a video that will never load waits forever. */
    const { host, video } = await media()
    video.dispatchEvent(new Event('error'))
    await host.updateComplete
    const said = part(host, 'failure') as HTMLElement
    expect(said).not.toBeNull()
    expect(said.getAttribute('role')).toBe('alert')
    expect(part(host, 'loading')).toBeNull()
  })

  test('and a new source clears the last one that failed', async () => {
    /* A playlist pointing the player somewhere else must not go on showing the
       error belonging to the entry before it. */
    const { host, video } = await media()
    video.dispatchEvent(new Event('error'))
    await host.updateComplete
    expect(part(host, 'failure')).not.toBeNull()

    video.dispatchEvent(new Event('loadstart'))
    await host.updateComplete
    expect(part(host, 'failure')).toBeNull()
  })

  test('nothing spins before anybody asks for playback', async () => {
    /* A video that has loaded nothing is a poster with a play control over it,
       which looks deliberate and is. A spinner there would say something is
       happening when nothing is, on every video on a page. */
    const host = await player()
    expect(part(host, 'loading')).toBeNull()
    expect(part(host, 'start')).not.toBeNull()
  })
})

describe('the mark that starts it', () => {
  test('comes back when the source changes under a playing video', async () => {
    /* Assigning `src` runs the media load algorithm, which stops playback and
       sets `paused` **without firing `pause`**: the events are `emptied` and
       `loadstart`. Listening for `play` and `pause` alone, this element went on
       believing it was playing after a playlist pointed it at the next entry,
       so the mark it draws only when paused stayed hidden and there was nothing
       to press. Measured in a browser: `paused` true, `playing` true, and no
       `pause` anywhere in the event log.

       `paused` is defined here rather than played for real: a spec cannot make
       a browser decode a file, and what is under test is which events this
       element listens to. */
    const host = await player()
    const video = host.shadowRoot?.querySelector('video') as HTMLVideoElement
    const paused = (value: boolean) => {
      Object.defineProperty(video, 'paused', { configurable: true, value })
    }

    paused(false)
    video.dispatchEvent(new Event('play'))
    await host.updateComplete
    expect(part(host, 'start')).toBeNull()

    /* The source changes. Only `emptied` arrives. */
    paused(true)
    video.dispatchEvent(new Event('emptied'))
    await host.updateComplete
    expect(part(host, 'start')).not.toBeNull()
  })

  test('a stopped video has one, because nothing else in it invites a press', async () => {
    /* Measured on the bar before this existed: the play glyph is 16 by 16 in a
       24 by 24 target, 0.12% of a 528 by 396 picture. What a reader meets is a
       still frame with some chrome along the bottom. */
    const host = await player()
    expect(part(host, 'start')).not.toBeNull()
  })

  test('and `none` is for a video that is decoration rather than something to start', async () => {
    const host = await player(
      '<helix-headless-video label="A clip" src="/clip.mp4" start-control="none"></helix-headless-video>',
    )
    expect(part(host, 'start')).toBeNull()
  })

  test('the browser drawing its own controls takes it away too', async () => {
    // That bar has a play button in it, and two would be two.
    const host = await player(
      '<helix-headless-video controls label="A clip" src="/clip.mp4"></helix-headless-video>',
    )
    expect(part(host, 'start')).toBeNull()
  })

  test('it goes while playing and comes back on pause', async () => {
    /* Whenever it is not playing, which is what the mark means: press this to
       play. Drawn only before the first play, it would mean two different
       things at two moments that are the same state. */
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
    /* `download` is honored for a same-origin file and ignored for any other,
       whatever headers come back. Measured on a cross-origin clip: the press
       navigated the whole page to the mp4, which reads as the player
       disappearing. An attribute the browser will ignore is a lie in the
       markup, so it is written only when it holds, and a new tab is the best a
       page can do with somebody else's file. */
    const away = await player(
      '<helix-headless-video extra-controls="download" label="A clip" src="https://example.com/clip.mp4"></helix-headless-video>',
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
       environment passes in one and fails in the other. */
    const ours = await player(
      '<helix-headless-video extra-controls="download" label="A clip" src="blob:whatever"></helix-headless-video>',
    )
    const link = part(ours, 'download') as HTMLAnchorElement
    expect(link.hasAttribute('download')).toBe(true)
    expect(link.hasAttribute('target')).toBe(false)
  })
})

describe('asking for another item in a set', () => {
  const skipper = async () =>
    player(
      '<helix-headless-video extra-controls="previous next" label="A clip" src="/clip.mp4"></helix-headless-video>',
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
    const host = await player(
      '<helix-headless-video controls label="A clip" src="/clip.mp4"></helix-headless-video>',
    )
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
      '<helix-headless-video extra-controls="remote" label="A clip" src="/clip.mp4"></helix-headless-video>',
    )
    expect(part(host, 'remote')).toBeNull()
  })

  test('connected, the remote control says so in a part name as well as aloud', async () => {
    const host = (await player(
      '<helix-headless-video extra-controls="remote" label="A clip" src="/clip.mp4"></helix-headless-video>',
    )) as Player & { remoteAvailable: boolean; remoteConnected: boolean }
    host.remoteAvailable = true
    await host.updateComplete
    expect(part(host, 'remote')?.getAttribute('part')).toBe('remote')
    host.remoteConnected = true
    await host.updateComplete
    expect(part(host, 'remote')?.getAttribute('part')).toBe('remote remote-pressed')
    expect(part(host, 'remote')?.getAttribute('aria-pressed')).toBe('true')
  })

  test('the page"s media session goes to whichever player was started last', async () => {
    /* There is one session per page and it decides where a headset's buttons
       land, so two players cannot both hold it. Render order is the wrong rule:
       a reader pressing play on their headphones means the one they started. */
    const session = navigator.mediaSession
    if (!session) {
      return
    }
    const first = await player(
      '<helix-headless-video label="First" src="/a.mp4"></helix-headless-video>',
    )
    const second = await player(
      '<helix-headless-video label="Second" src="/b.mp4"></helix-headless-video>',
    )

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
    const first = await player(
      '<helix-headless-video label="First" src="/a.mp4"></helix-headless-video>',
    )
    ;(part(first, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (first as Player).updateComplete

    const second = await player(
      '<helix-headless-video label="Second" src="/b.mp4"></helix-headless-video>',
    )
    ;(part(second, 'video') as HTMLVideoElement).dispatchEvent(new Event('play'))
    await (second as Player).updateComplete

    first.remove()
    expect(session.metadata?.title).toBe('Second')
  })

  test('the native controls keep their own keyboard, and their own focus', async () => {
    /* Two handlers on one press is a video that seeks twice, or plays and
       immediately pauses. A consumer who asked for the browser's bar asked for
       its keyboard with it, and it brings its own focus stop. */
    const host = await player(
      '<helix-headless-video controls label="A clip" src="/clip.mp4"></helix-headless-video>',
    )
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

    test('playback is on the host, because CSS cannot ask a video', async () => {
      /* `paused` is a property and never an attribute, so `video:not([paused])`
         matched every video in existence: the rule that hides the bar while
         playing hid it always, including on a paused video, which is the one
         state it exists to keep it visible in. */
      const host = await player()
      expect(host.hasAttribute('data-playing')).toBe(false)

      const video = part(host, 'video') as HTMLVideoElement
      /* The state as well as the event. The element reads `video.paused` rather
         than trusting that a `play` event means playing, so dispatching alone
         leaves `paused` true in a real engine and the flag never moves: a spec
         that only dispatches passes against a shim and nothing else. */
      const pausedAs = (value: boolean) => {
        Object.defineProperty(video, 'paused', { configurable: true, value })
      }

      pausedAs(false)
      video.dispatchEvent(new Event('play'))
      await (host as Player).updateComplete
      expect(host.hasAttribute('data-playing')).toBe(true)

      pausedAs(true)
      video.dispatchEvent(new Event('pause'))
      await (host as Player).updateComplete
      expect(host.hasAttribute('data-playing')).toBe(false)
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

describe('pressing the picture', () => {
  const media = async (markup?: string): Promise<{ host: Player; video: HTMLVideoElement }> => {
    const host = await player(markup)
    const video = host.shadowRoot?.querySelector('video') as HTMLVideoElement
    return { host, video }
  }

  /* `play` and `pause` are stubbed rather than driven, because whether a browser
     decodes a file is not what is under test: whether a press on the picture
     reaches the element's own toggle is. */
  const stub = (video: HTMLVideoElement) => {
    const calls: string[] = []
    Object.defineProperty(video, 'paused', { configurable: true, value: true })
    video.play = (() => {
      calls.push('play')
      return Promise.resolve()
    }) as HTMLVideoElement['play']
    video.pause = () => {
      calls.push('pause')
    }
    return calls
  }

  const press = (video: HTMLVideoElement) => {
    video.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  }

  test('a press on the picture starts it, which is the target a reader aims at', async () => {
    const { host, video } = await media()
    const calls = stub(video)

    press(video)
    await host.updateComplete

    expect(calls).toEqual(['play'])
  })

  test('a press does nothing while the browser is drawing its own bar', async () => {
    // Acting here would toggle twice, once in this element and once in the UA,
    // which cancels out and reads as a player that ignores the press.
    const { host, video } = await media(
      '<helix-headless-video controls label="A clip" src="/clip.mp4"></helix-headless-video>',
    )
    const calls = stub(video)

    press(video)
    await host.updateComplete

    expect(calls).toEqual([])
  })

  test('a press on a player whose chrome has gone asks for it back, and nothing else', async () => {
    // Which is what every touch player does: the first tap is for the controls,
    // and the second means what it says.
    const { host, video } = await media()
    const calls = stub(video)
    const idled = host as unknown as { idle: boolean }
    idled.idle = true
    await host.updateComplete

    press(video)
    await host.updateComplete

    expect(calls).toEqual([])
    expect(idled.idle).toBe(false)

    press(video)
    await host.updateComplete

    expect(calls).toEqual(['play'])
  })
})
