import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../video/index.js')
})

type Playlist = HTMLElement & {
  active: string
  requestActive(next: string): boolean
  updateComplete: Promise<boolean>
}
type Entry = HTMLElement & { current: boolean; disabled: boolean; value: string }
type Player = HTMLElement & {
  label: string
  play: () => void
  poster: string
  src: string
  updateComplete: Promise<boolean>
}

/** Counts plays without needing a browser to decode anything. */
const watchPlays = (one: Player): (() => number) => {
  let count = 0
  one.play = () => {
    count += 1
  }
  return () => count
}

const list = async (extra = '') =>
  (await mount(`<helix-headless-video-playlist default-active="one" label="Episodes"${extra}>
    <helix-headless-video label="Player" slot="player"></helix-headless-video>
    <helix-headless-video-playlist-item poster="/one.jpg" src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item src="/two.mp4" value="two">Two</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item disabled src="/three.mp4" value="three">Three</helix-headless-video-playlist-item>
  </helix-headless-video-playlist>`)) as Playlist

const entries = (host: Playlist) =>
  [...host.querySelectorAll('helix-headless-video-playlist-item')] as Entry[]

const player = (host: Playlist) => host.querySelector('helix-headless-video') as Player

describe('a video playlist', () => {
  test('points the slotted player at the current entry', async () => {
    /* The player is the consumer's, carrying their appearance and their extra
       controls, so a playlist that rendered its own would lose all of it. What
       it does instead is set `src`, which is the whole of the contract. */
    const host = await list()
    await host.updateComplete
    expect(player(host).src).toBe('/one.mp4')
    expect(player(host).poster).toBe('/one.jpg')
  })

  test('and takes the entry`s words, not everything in it, as the player`s name', async () => {
    /* Which is what a lock screen shows, the player handing it to the media
       session as the title. Never read `textContent` for it: that takes the
       whole subtree, so a row with a duration beside it reports "One12:00" and
       that string goes all the way to the platform. */
    const host = (await mount(`<helix-headless-video-playlist default-active="one" label="Episodes">
      <helix-headless-video label="Player" slot="player"></helix-headless-video>
      <helix-headless-video-playlist-item src="/one.mp4" value="one">One<span slot="meta">12:00</span></helix-headless-video-playlist-item>
    </helix-headless-video-playlist>`)) as Playlist
    await host.updateComplete
    expect(player(host).label).toBe('One')
  })

  test('choosing an entry moves the player', async () => {
    const host = await list()
    await host.updateComplete
    const button = part(entries(host)[1] as HTMLElement, 'item') as HTMLElement
    button.click()
    await host.updateComplete
    expect(host.active).toBe('two')
    expect(player(host).src).toBe('/two.mp4')
  })

  test('and refusing the entry`s own event leaves the player where it was', async () => {
    /* `helix-select` is documented as cancelable on the entry and on the menu,
       and the menu's own comment says re-announcing it from the host is what
       makes `preventDefault()` refuse the selection in one place. The playlist
       is the one thing that reads it, so a refusal it ignored was a veto that
       did nothing anywhere: valid code, no error, and the selection happening
       regardless. Bound on the entry, which is the position that can refuse a
       bubbling event before this element sees it. */
    const host = await list()
    await host.updateComplete
    const second = entries(host)[1] as Entry
    second.addEventListener('helix-select', (event) => event.preventDefault())
    ;(part(second, 'item') as HTMLElement).click()
    await host.updateComplete
    expect(host.active).toBe('one')
    expect(player(host).src).toBe('/one.mp4')
  })

  test('only one entry is current, and it says so with aria-current', async () => {
    /* `aria-current` and not `aria-selected`, which belongs to the roles that
       have a selection. What is true of this row is that the player is on it. */
    const host = await list()
    await host.updateComplete
    const marks = entries(host).map((one) =>
      (part(one, 'item') as HTMLElement).getAttribute('aria-current'),
    )
    expect(marks).toEqual(['true', null, null])
  })

  test('the player asking for the next one advances it', async () => {
    // The video announces and does nothing, because a `<video>` plays one
    // resource. This is the thing that answers.
    const host = await list()
    await host.updateComplete
    player(host).dispatchEvent(new CustomEvent('helix-next', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.active).toBe('two')
  })

  /* As the player sends it: relayed from the `<video>` without bubbling, the
     way the platform sends `ended`. A bubbling event here is what let the
     playlist pass this while it never advanced behind a real player. */
  test('and reaching the end advances it too', async () => {
    const host = await list()
    await host.updateComplete
    player(host).dispatchEvent(new Event('ended'))
    await host.updateComplete
    expect(host.active).toBe('two')
  })

  test('a disabled entry is skipped rather than landed on', async () => {
    const host = await list()
    await host.updateComplete
    host.requestActive('two')
    await host.updateComplete
    player(host).dispatchEvent(new Event('ended'))
    await host.updateComplete
    // Three is disabled, so there is nowhere after two to go.
    expect(host.active).toBe('two')
  })

  test('previous at the first entry stays put', async () => {
    const host = await list()
    await host.updateComplete
    player(host).dispatchEvent(new CustomEvent('helix-previous', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.active).toBe('one')
  })

  test('the entry`s own selection does not reach the consumer', async () => {
    /* The entry says it was chosen and this element says what is playing. A
       consumer hearing both would hear one press twice under two names. */
    const host = await list()
    await host.updateComplete
    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    ;(part(entries(host)[1] as HTMLElement, 'item') as HTMLElement).click()
    expect(heard).toBe(0)
  })

  test('the entries are a list, named, and each one a real button', async () => {
    const host = await list()
    await host.updateComplete
    expect(role(part(host, 'items') as HTMLElement)).toBe('list')
    expect((part(host, 'items') as HTMLElement).getAttribute('aria-label')).toBe('Episodes')
    expect((part(entries(host)[0] as HTMLElement, 'item') as HTMLElement).tagName).toBe('BUTTON')
  })
})

describe('choosing an entry', () => {
  test('plays it, which is the whole point of pressing it', async () => {
    const host = await list()
    await host.updateComplete
    const plays = watchPlays(player(host))

    /* Nothing yet: pointing the player at the opening entry is not somebody
       asking for it. */
    expect(plays()).toBe(0)

    /* Pressed, not assigned. Only the three ways a reader moves through a
       playlist ask for playback: a press, next or previous, and one clip ending
       into the next. A consumer setting `active` is not one of them. */
    ;(part(entries(host)[1] as HTMLElement, 'item') as HTMLElement).click()
    await host.updateComplete
    await player(host).updateComplete
    await Promise.resolve()
    expect(plays()).toBe(1)
  })

  test('and the play waits for the player to have the new source', async () => {
    /* `src` on the player is a property, and the `<video>` inside it only takes
       the new source on its next render. Playing before that plays the outgoing
       clip for an instant, and the load that follows stops it: measured as a
       player left paused on the entry that had just been chosen. */
    const host = await list()
    await host.updateComplete
    const one = player(host)
    const seen: string[] = []
    one.play = () => {
      seen.push(one.src)
    }

    ;(part(entries(host)[1] as HTMLElement, 'item') as HTMLElement).click()
    await host.updateComplete
    await one.updateComplete
    await Promise.resolve()
    expect(seen).toEqual(['/two.mp4'])
  })
})
