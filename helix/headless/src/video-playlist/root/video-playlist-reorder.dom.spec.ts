import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The queue could not be reordered: a reader who wanted the next clip sooner
   had to wait for the ones before it, or the page had to build its own
   controls beside the list. */

type Playlist = HTMLElement & { reorderable: boolean; updateComplete: Promise<boolean> }
type Entry = HTMLElement & { value: string }

interface Detail {
  from: number
  key: string
  keys: string[]
  to: number
}

const list = async (extra = 'reorderable'): Promise<Playlist> => {
  const host = (await mount(`<helix-headless-video-playlist label="Episodes" ${extra}>
    <helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item src="/two.mp4" value="two">Two</helix-headless-video-playlist-item>
    <helix-headless-video-playlist-item src="/three.mp4" value="three">Three</helix-headless-video-playlist-item>
  </helix-headless-video-playlist>`)) as Playlist
  await settle(host)
  return host
}

const entries = (host: Playlist): Entry[] => [
  ...host.querySelectorAll<Entry>('helix-headless-video-playlist-item'),
]

const order = (host: Playlist): string[] => entries(host).map((one) => one.value)

const button = (entry: Entry | undefined): HTMLButtonElement =>
  entry?.shadowRoot?.querySelector('button') as HTMLButtonElement

/** Answers each move as a page would, moving the entries to the order asked for. */
const follow = (host: Playlist): Detail[] => {
  const heard: Detail[] = []
  host.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    for (const key of detail.keys) {
      host.append(entries(host).find((one) => one.value === key) as Entry)
    }
  })
  return heard
}

const press = async (host: Playlist, key: string, altKey = true): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', {
    altKey,
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement
  }
  ;(active as HTMLElement).dispatchEvent(event)
  await settle(host)
  return event
}

describe('a reorderable playlist', () => {
  test('moves the focused entry a place with Alt and Down, asking first, and says so', async () => {
    const host = await list()
    const asked: Detail[] = []
    host.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(host)
    button(entries(host)[0]).focus()
    expect((await press(host, 'ArrowDown')).defaultPrevented).toBe(true)
    expect(asked.map((one) => one.keys)).toEqual([['two', 'one', 'three']])
    expect(heard.map((one) => [one.key, one.from, one.to])).toEqual([['one', 0, 1]])
    expect(order(host)).toEqual(['two', 'one', 'three'])
    /* The region is written a frame on, so a reader's screen reader hears it. */
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await host.updateComplete
    expect(part(host, 'live')?.textContent?.trim()).toBe('One moved to position 2 of 3')
  })

  test('moves it to either end with Alt and End or Home', async () => {
    const host = await list()
    follow(host)
    button(entries(host)[0]).focus()
    await press(host, 'End')
    expect(order(host)).toEqual(['two', 'three', 'one'])
  })

  test('keeps the entries where they are when a listener refuses', async () => {
    const host = await list()
    host.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    const heard = follow(host)
    button(entries(host)[1]).focus()
    await press(host, 'ArrowUp')
    expect(heard).toEqual([])
    expect(order(host)).toEqual(['one', 'two', 'three'])
  })

  test('moves nothing without `reorderable`', async () => {
    const host = await list('')
    const heard = follow(host)
    button(entries(host)[0]).focus()
    await press(host, 'ArrowDown')
    expect(heard).toEqual([])
  })
})
