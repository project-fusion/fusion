import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../video/index.js')
})

type Menu = HTMLElement & { label: string; updateComplete: Promise<boolean> }
type Playlist = HTMLElement & { active: string; updateComplete: Promise<boolean> }

/** The composition the menu is designed for: it sits in the player's bar. */
const mountMenu = async (): Promise<{ menu: Menu; playlist: Playlist }> => {
  const playlist =
    (await mount(`<helix-headless-video-playlist default-active="one" label="Episodes">
    <helix-headless-video label="Player" slot="player">
      <helix-headless-video-playlist-menu slot="controls"></helix-headless-video-playlist-menu>
    </helix-headless-video>
    <helix-headless-video-playlist-item poster="/one.jpg" src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item poster="/two.jpg" src="/two.mp4" value="two">Two</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item disabled src="/three.mp4" value="three">Three</helix-headless-video-playlist-item>
  </helix-headless-video-playlist>`)) as Playlist
  const menu = playlist.querySelector<Menu>('helix-headless-video-playlist-menu')
  if (!menu) {
    throw new Error('the menu did not upgrade')
  }
  await playlist.updateComplete
  await menu.updateComplete
  /* A second turn: the menu resolves its playlist after its own first update,
     and reads the entries on the render that follows. */
  await menu.updateComplete
  return { menu, playlist }
}

/** The menu items the menu rendered, which are the playlist's entries. */
const entries = (menu: Menu): HTMLElement[] => [
  ...(menu.shadowRoot?.querySelectorAll<HTMLElement>('helix-headless-menu-item') ?? []),
]

/**
 * Whether each entry says it is the one on, read off the row a reader lands
 * on. The item renders that row itself, so a role or a state written on the
 * item's host is on a node focus never reaches, which is where this was.
 */
const ticked = async (menu: Menu): Promise<(string | null | undefined)[]> => {
  const all = entries(menu) as (HTMLElement & { updateComplete: Promise<boolean> })[]
  await Promise.all(all.map((one) => one.updateComplete))
  return all.map((one) =>
    one.shadowRoot?.querySelector('[role="menuitemradio"]')?.getAttribute('aria-checked'),
  )
}

describe('video playlist menu', () => {
  test('finds its playlist upward, across the slot it was placed in', async () => {
    const { menu } = await mountMenu()
    expect(entries(menu)).toHaveLength(3)
  })

  test('the player renders a bar with a slot for it to land in', async () => {
    /* Every other assertion here reads the menu's own shadow root and passes
       while the menu is assigned to no slot at all. Set `controls` on the video
       and the *browser* draws the bar, Helix's own is not rendered, and there is
       no `controls` slot to land in: a component that renders correctly into
       nowhere.
     *
     * Asserted through the player's slots rather than `menu.assignedSlot`,
     * which happy-dom does not implement and reports as `undefined` whatever
     * the truth. That is not the weaker test: with `controls` set there is no
     * bar, so there is no `controls` slot, and this fails. */
    const { playlist } = await mountMenu()
    const player = playlist.querySelector('helix-headless-video')
    const slots = [...(player?.shadowRoot?.querySelectorAll('slot') ?? [])].map((one) => one.name)
    expect(slots).toContain('controls')
  })

  test('carries every entry, in the order the playlist holds them', async () => {
    const { menu } = await mountMenu()
    expect(entries(menu).map((one) => one.getAttribute('value'))).toEqual(['one', 'two', 'three'])
  })

  test("carries each entry's still, so an episode is recognized not read", async () => {
    const { menu } = await mountMenu()
    const posters = entries(menu).map(
      (one) => one.querySelector('[part="poster"]')?.getAttribute('src') ?? null,
    )
    expect(posters).toEqual(['/one.jpg', '/two.jpg', null])
  })

  test('omits the still where there is none, rather than serving an empty one', async () => {
    /* An `<img>` with no `src` is a broken-image glyph in every engine, which
       is worse than the gap it fills. The third entry has no poster and the
       assertion above is what says so. */
    const { menu } = await mountMenu()
    expect(entries(menu)[2]?.querySelector('[part="poster"]')).toBeNull()
  })

  test('marks the current entry, and only that one', async () => {
    const { menu } = await mountMenu()
    expect(await ticked(menu)).toEqual(['true', 'false', 'false'])
  })

  test('carries a disabled entry through, rather than dropping it', async () => {
    const { menu } = await mountMenu()
    /* Shown and unusable, not absent. A reader who cannot play an episode is
       told it is there; a menu one item shorter says the season is. */
    expect(entries(menu)[2]?.hasAttribute('disabled')).toBe(true)
  })

  test('choosing moves the playlist, through the event an entry dispatches', async () => {
    const { menu, playlist } = await mountMenu()
    menu.dispatchEvent(
      new CustomEvent('helix-select', { bubbles: true, composed: true, detail: { value: 'two' } }),
    )
    await playlist.updateComplete
    expect(playlist.active).toBe('two')
  })

  test('requests rather than assigning, so a consumer can refuse the move', async () => {
    const { menu, playlist } = await mountMenu()
    /* The trap this component was built around. Writing `playlist.active` is
       the shorter path and skips `helix-before-activate`, so a consumer gets
       no chance to refuse the move. The menu requests instead. */
    menu.dispatchEvent(
      new CustomEvent('helix-select', { bubbles: true, composed: true, detail: { value: 'two' } }),
    )
    await playlist.updateComplete
    menu.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        composed: true,
        detail: { value: 'three' },
      }),
    )
    await playlist.updateComplete
    expect(playlist.active).toBe('three')
  })

  test('a menu item firing reaches the playlist, which is the real path', async () => {
    /* The tests above dispatch from the host, which skips the two steps that
       are this component's own work: the item announces, the handler stops it,
       and the host re-announces. Dispatching from the item is what exercises
       them, and without it the handler could be missing entirely and every
       other assertion here would still pass. */
    const { menu, playlist } = await mountMenu()
    entries(menu)[1]?.dispatchEvent(
      new CustomEvent('helix-select', { bubbles: true, composed: true, detail: { value: 'two' } }),
    )
    await playlist.updateComplete
    expect(playlist.active).toBe('two')
  })

  test("what leaves the menu is the menu's own event, not the item's", async () => {
    /* So a consumer listening here sees what the playlist sees. The item's
       event is stopped and re-announced from the host rather than let through,
       which is also what makes `preventDefault()` a refusal in one place. */
    const { menu } = await mountMenu()
    let from: EventTarget | null = null
    menu.addEventListener('helix-select', (event) => {
      from = event.target
    })
    entries(menu)[1]?.dispatchEvent(
      new CustomEvent('helix-select', { bubbles: true, composed: true, detail: { value: 'two' } }),
    )
    expect<EventTarget | null>(from).toBe(menu)
  })

  test('re-reads when an entry is added after it rendered', async () => {
    const { menu, playlist } = await mountMenu()
    const added = document.createElement('helix-headless-video-playlist-item')
    added.setAttribute('value', 'four')
    added.setAttribute('src', '/four.mp4')
    playlist.append(added)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await menu.updateComplete
    expect(entries(menu)).toHaveLength(4)
  })

  test('re-reads the current entry when it opens', async () => {
    /* The mark is not live, and this is the assertion that says so on purpose.
       `active` is a property with no attribute, so a descendant has nothing to
       observe, and mirroring it to a `data-` name is ruled out: it is a payload
       rather than a boolean fact, and writing it put an attribute onto every
       host `tree-root.ssr.spec.ts` had asserted was clean. Re-reading on open
       is what covers it, a closed menu's mark being something nobody sees. */
    const { menu, playlist } = await mountMenu()
    playlist.active = 'two'
    await playlist.updateComplete
    menu.dispatchEvent(new CustomEvent('helix-before-open', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(await ticked(menu)).toEqual(['false', 'true', 'false'])
  })

  /* The playlist plays its first entry when nothing names one, and the menu
     marked no entry until one was named. */
  test('marks the entry playing when nothing named it', async () => {
    const playlist = (await mount(`<helix-headless-video-playlist label="Episodes">
      <helix-headless-video label="Player" slot="player">
        <helix-headless-video-playlist-menu slot="controls"></helix-headless-video-playlist-menu>
      </helix-headless-video>
      <helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
      <helix-headless-video-playlist-item src="/two.mp4" value="two">Two</helix-headless-video-playlist-item>
    </helix-headless-video-playlist>`)) as Playlist
    const menu = playlist.querySelector('helix-headless-video-playlist-menu') as Menu
    await playlist.updateComplete
    await menu.updateComplete
    menu.dispatchEvent(new CustomEvent('helix-before-open', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(await ticked(menu)).toEqual(['true', 'false'])
  })

  test('its trigger says it opens a menu, and whether the menu is open', async () => {
    const { menu } = await mountMenu()
    const trigger = part(menu, 'trigger') as HTMLElement
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const inner = part(menu, 'menu') as HTMLElement
    inner.dispatchEvent(
      Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }),
    )
    await menu.updateComplete
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  /* The menu sits in the player's bar, so its keys bubbled to the player:
     ArrowDown lowered the volume and Space toggled playback. Browser only:
     happy-dom does not carry an event from a slotted node through its slot, so
     the press never reaches the player there and this passes against code that
     takes it. */
  ;(hasLayout() ? test : test.skip)('its keys stay its own inside the player', async () => {
    const { menu, playlist } = await mountMenu()
    const player = playlist.querySelector('helix-headless-video') as HTMLElement
    const video = player.shadowRoot?.querySelector('video') as HTMLVideoElement
    let toggles = 0
    video.play = () => {
      toggles += 1
      return Promise.resolve()
    }
    const volume = video.volume
    for (const key of ['ArrowDown', ' ']) {
      entries(menu)[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
    }
    expect(video.volume).toBe(volume)
    expect(toggles).toBe(0)
  })

  test('names itself and its trigger from one property', async () => {
    const { menu } = await mountMenu()
    menu.label = 'Camera angles'
    await menu.updateComplete
    expect(part(menu, 'trigger')?.getAttribute('aria-label')).toBe('Camera angles')
  })
})
