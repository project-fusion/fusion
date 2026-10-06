import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the playlist's hooks change, which only a browser computes. Run them
   with `bun run specs:browser video-playlist`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const playlist = async (style = ''): Promise<HTMLElement & Updatable> => {
  const host =
    (await mount(`<helix-video-playlist label="Episodes" default-active="one" style="${style}">
    <helix-video-playlist-item value="one" src="/one.mp4">One<span slot="meta">2:00</span></helix-video-playlist-item>
    <helix-video-playlist-item value="two" src="/two.mp4">Two</helix-video-playlist-item>
  </helix-video-playlist>`)) as HTMLElement & Updatable
  await settle(host)
  const item = host.querySelector('helix-video-playlist-item') as HTMLElement & Updatable
  await settle(item)
  return host
}

const row = (host: HTMLElement): HTMLElement => {
  const item = host.querySelector('helix-video-playlist-item') as HTMLElement
  return item.shadowRoot?.querySelector('[part~="item"]') as HTMLElement
}

describe('video playlist hooks', () => {
  geometry('the rows take the hooks, and keep their look without them', async () => {
    const plain = await playlist()
    const before = getComputedStyle(row(plain))
    expect(before.borderTopLeftRadius).not.toBe('7px')
    const hooked = await playlist(
      '--video-playlist-gap: 3px; --video-playlist-item-radius: 7px; --video-playlist-item-gap: 9px; --video-playlist-item-current-background-color: rgb(1, 2, 3); --video-playlist-item-current-mark-color: rgb(4, 5, 6); --video-playlist-item-meta-color: rgb(10, 11, 12)',
    )
    const after = getComputedStyle(row(hooked))
    expect(getComputedStyle(hooked).rowGap).toBe('3px')
    expect(after.borderTopLeftRadius).toBe('7px')
    expect(after.columnGap).toBe('9px')
    expect(after.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(row(hooked), '::before').backgroundColor).toBe('rgb(4, 5, 6)')
    const meta = hooked.querySelector('[slot="meta"]') as HTMLElement
    expect(getComputedStyle(meta).color).toBe('rgb(10, 11, 12)')
  })
})
