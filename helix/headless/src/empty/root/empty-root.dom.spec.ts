import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('empty view', () => {
  test('announces itself, because it usually replaces something that was loading', async () => {
    /* Otherwise a screen-reader user is left waiting for a search result that
       already came back with nothing. From a region there before its words:
       the host was the region, and a page inserts an empty state with its
       message in it, which is a region arriving with its words. */
    /* Inserted by hand and read after the first render, before a frame has
       passed: a harness that waits for frames would read the filled region. */
    document.body.innerHTML =
      '<helix-headless-empty><h2 slot="heading">Nothing here</h2><p>No results.</p></helix-headless-empty>'
    const empty = document.body.firstElementChild as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await empty.updateComplete
    const live = part(empty, 'live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    expect(live.textContent?.trim()).toBe('')
    expect(role(empty)).toBeNull()
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await empty.updateComplete
    expect(live.textContent?.trim()).toBe('Nothing here No results.')
  })

  /* The live copy and the words it copies were both in the tree for the
     seven-second hold, so a reader moving through the page met them twice. */
  test('hides the words it copies while the copy holds them, and never the actions', async () => {
    document.body.innerHTML =
      '<helix-headless-empty><h2 slot="heading">Nothing here</h2><p>No results.</p><button slot="actions">Clear</button></helix-headless-empty>'
    const empty = document.body.firstElementChild as HTMLElement & {
      arrival: { said: string }
      requestUpdate: () => void
      updateComplete: Promise<boolean>
    }
    await empty.updateComplete
    const hidden = (name: string): string | null =>
      empty.shadowRoot
        ?.querySelector(name === '' ? 'slot:not([name])' : `slot[name="${name}"]`)
        ?.getAttribute('aria-hidden') ?? null
    expect(hidden('heading')).toBeNull()
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await empty.updateComplete
    expect([hidden('heading'), hidden(''), hidden('actions')]).toEqual(['true', 'true', null])
    /* The hold ending: the copy empties and the words are back. */
    empty.arrival.said = ''
    empty.requestUpdate()
    await empty.updateComplete
    expect([hidden('heading'), hidden('')]).toEqual([null, null])
  })

  test('one that came with the page as it loaded is not announced', async () => {
    /* A framework that serves no declarative shadow DOM sends an empty state
       that was always there, and this cannot tell it from one that arrived by
       asking `serverRendered`: the page still loading is what says so. */
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' })
    try {
      document.body.innerHTML = '<helix-headless-empty><p>No results.</p></helix-headless-empty>'
      const empty = document.body.firstElementChild as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await empty.updateComplete
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
      await empty.updateComplete
      expect(part(empty, 'live')?.textContent?.trim()).toBe('')
    } finally {
      delete (document as unknown as { readyState?: string }).readyState
    }
  })

  test('a state that was always there announces nothing, because nothing changed', async () => {
    const empty = await mount('<helix-headless-empty no-announce><p>x</p></helix-headless-empty>')
    expect(part(empty, 'live')).toBeNull()
    expect(role(empty)).toBeNull()
  })

  test('every region is a bare slot the consumer fills', async () => {
    const empty = await mount(`
      <helix-headless-empty>
        <helix-headless-icon slot="icon" name="x"></helix-headless-icon>
        <h2 slot="heading">Nothing here</h2>
        <p>Try another search.</p>
        <span slot="actions">go</span>
      </helix-headless-empty>`)
    expect(slotted(empty, 'heading')[0]?.textContent).toBe('Nothing here')
    expect(slotted(empty, 'actions')[0]?.textContent).toBe('go')
  })

  /* A page rendering from data had to write a heading element to get one,
     and a `<p slot="heading">` was no heading in the outline at all. */
  test('draws a heading from words, at the level asked, and yields it to a slotted one', async () => {
    const drawn = await mount(
      '<helix-headless-empty heading="No results" heading-level="2">Try another word.</helix-headless-empty>',
    )
    const heading = part(drawn, 'heading') as HTMLElement
    expect(heading.getAttribute('role')).toBe('heading')
    expect(heading.getAttribute('aria-level')).toBe('2')
    expect(heading.textContent?.trim()).toBe('No results')
    expect(heading.parentElement?.getAttribute('name')).toBe('heading')
    const resting = await mount('<helix-headless-empty heading="Nothing"></helix-headless-empty>')
    expect(part(resting, 'heading')?.getAttribute('aria-level')).toBe('3')
    expect(part(await mount('<helix-headless-empty></helix-headless-empty>'), 'heading')).toBeNull()
  })

  test('announces the drawn heading with the message', async () => {
    document.body.innerHTML =
      '<helix-headless-empty heading="Nothing here"><p>No results.</p></helix-headless-empty>'
    const empty = document.body.firstElementChild as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await empty.updateComplete
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await empty.updateComplete
    expect(part(empty, 'live')?.textContent?.trim()).toBe('Nothing here No results.')
  })
})
