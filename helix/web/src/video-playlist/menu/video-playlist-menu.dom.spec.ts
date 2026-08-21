import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../video/index.js')
})

type Menu = HTMLElement & { label: string; updateComplete: Promise<boolean> }
type Playlist = HTMLElement & { active: string; updateComplete: Promise<boolean> }

/** The composition the menu is designed for: it sits in the player's bar. */
const mountMenu = async (): Promise<{ menu: Menu; playlist: Playlist }> => {
  const playlist = (await mount(`<helix-video-playlist default-active="one" label="Episodes">
    <helix-video label="Player" slot="player">
      <helix-video-playlist-menu slot="controls"></helix-video-playlist-menu>
    </helix-video>
    <helix-video-playlist-item src="/one.mp4" value="one">One</helix-video-playlist-item>
    <helix-video-playlist-item src="/two.mp4" value="two">Two</helix-video-playlist-item>
    <helix-video-playlist-item disabled src="/three.mp4" value="three">Three</helix-video-playlist-item>
  </helix-video-playlist>`)) as Playlist
  const menu = playlist.querySelector<Menu>('helix-video-playlist-menu')
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
  ...(menu.shadowRoot?.querySelectorAll<HTMLElement>('helix-menu-item') ?? []),
]

describe('video playlist menu', () => {
  test('finds its playlist upward, across the slot it was placed in', async () => {
    const { menu } = await mountMenu()
    expect(entries(menu)).toHaveLength(3)
  })

  test('the player renders a bar with a slot for it to land in', async () => {
    /* Every other assertion here reads the menu's own shadow root, and all of
       them passed while the menu was assigned to no slot at all: the example
       and this file both set `controls` on the video, which means the
       *browser* draws the bar and Helix's own is not rendered, so there was no
       `controls` slot to land in. Structure without placement is a component
       that renders correctly into nowhere, and a screenshot is what found it.
     *
     * Asserted through the player's slots rather than `menu.assignedSlot`,
     * which happy-dom does not implement and reports as `undefined` whatever
     * the truth. That is not a weaker test of this bug: with `controls` set
     * there is no bar, so there is no `controls` slot, and this fails. */
    const { playlist } = await mountMenu()
    const player = playlist.querySelector('helix-video')
    const slots = [...(player?.shadowRoot?.querySelectorAll('slot') ?? [])].map((one) => one.name)
    expect(slots).toContain('controls')
  })

  test('carries every entry, in the order the playlist holds them', async () => {
    const { menu } = await mountMenu()
    expect(entries(menu).map((one) => one.getAttribute('value'))).toEqual(['one', 'two', 'three'])
  })

  test('marks the current entry, and only that one', async () => {
    const { menu } = await mountMenu()
    const checked = entries(menu).map((one) => one.getAttribute('aria-checked'))
    expect(checked).toEqual(['true', 'false', 'false'])
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

  test('never assigns active, so the playlist does not latch controlled', async () => {
    const { menu, playlist } = await mountMenu()
    /* The trap this component was built around. Writing `playlist.active`
       would look like the shorter path and would settle the element into
       controlled mode, after which it waits for a consumer nobody wrote. If
       the menu had done that, a second selection would not move it. */
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
    expect(from).toBe(menu)
  })

  test('re-reads when an entry is added after it rendered', async () => {
    const { menu, playlist } = await mountMenu()
    const added = document.createElement('helix-video-playlist-item')
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
    menu.dispatchEvent(new CustomEvent('helix-open', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(entries(menu).map((one) => one.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  test('names itself and its trigger from one property', async () => {
    const { menu } = await mountMenu()
    menu.label = 'Camera angles'
    await menu.updateComplete
    expect(part(menu, 'trigger')?.getAttribute('aria-label')).toBe('Camera angles')
  })
})
