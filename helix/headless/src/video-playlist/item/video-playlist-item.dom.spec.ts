import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Entry = HTMLElement & { current: boolean; text: string; updateComplete: Promise<boolean> }

const entry = async (attributes = 'value="a"', inner = 'His Girl Friday'): Promise<Entry> =>
  (await mount(
    `<helix-headless-video-playlist-item ${attributes}>${inner}</helix-headless-video-playlist-item>`,
  )) as Entry

/**
 * One entry, and the contract that is the entry's rather than the playlist's.
 *
 * **The playlist already proves the coordination**, which is which entry is
 * current and what choosing one plays. What the entry owns alone is what its
 * *name* is, and that is the one thing the playlist cannot check, because it
 * asks the entry.
 */
describe('one playlist entry', () => {
  /* `textContent` takes the whole subtree, so a row with a duration beside it
     reads "His Girl Friday0:06", and that string goes to the player and on to
     the lock screen. Only the unslotted nodes are the name; anything named is a
     column beside it. */
  test('is named by its words, not by everything inside it', async () => {
    const bare = await entry()
    expect(bare.text).toBe('His Girl Friday')

    const withMeta = await entry('value="a"', 'His Girl Friday<span slot="meta">0:06</span>')
    expect(withMeta.text).toBe('His Girl Friday')
    expect(withMeta.textContent).toContain('0:06')
  })

  /* Light DOM rather than `assignedNodes`, so the same answer comes back on a
     server, where there is no slot to ask. */
  test('answers with its own children, so a server can ask too', async () => {
    const host = await entry('value="a"', '<span slot="media"><img alt="" /></span>Casablanca')
    expect(host.text).toBe('Casablanca')
  })

  /* Absent rather than `"false"` on the others. A reader is told which one is
     playing; being told about each of the rest that it is not is the same fact
     eleven times. */
  test('says it is playing, and the others say nothing at all', async () => {
    const host = await entry()
    expect(part(host, 'item')?.hasAttribute('aria-current')).toBe(false)

    host.current = true
    await host.updateComplete
    expect(part(host, 'item')?.getAttribute('aria-current')).toBe('true')
  })

  /* The poster is the `media` slot's fallback rather than something drawn beside
     it, which is this library's rule for a content property: a consumer with a
     better thumbnail slots one and the two can never both appear. `alt=""`,
     because the row's own words already name it. */
  test('falls back to the poster rather than drawing it beside a thumbnail', async () => {
    const host = await entry('value="a" poster="/still.jpg"')
    const thumbnail = part(host, 'thumbnail') as HTMLImageElement | null
    expect(thumbnail?.getAttribute('src')).toBe('/still.jpg')
    expect(thumbnail?.getAttribute('alt')).toBe('')
    expect(thumbnail?.closest('slot')?.getAttribute('name')).toBe('media')

    expect(part(await entry(), 'thumbnail')).toBeNull()
  })

  /* The button sits inside the `listitem` rather than carrying the role, because
     a list of buttons is not a list to anything reading it. */
  test('is a row containing a control, not a control claiming to be a row', async () => {
    const host = await entry()
    expect(part(host, 'container')?.getAttribute('role')).toBe('listitem')
    expect(part(host, 'item')?.tagName).toBe('BUTTON')
    expect(part(host, 'container')?.contains(part(host, 'item') as Node)).toBe(true)
  })
})
