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
})
