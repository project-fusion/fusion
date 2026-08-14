import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('empty state', () => {
  test('announces itself, because it usually replaces something that was loading', async () => {
    // Otherwise a screen-reader user is left waiting for a search result that
    // already came back with nothing.
    const empty = await mount('<helix-empty-state><p>No results.</p></helix-empty-state>')
    expect(role(empty)).toBe('status')
    expect(empty.hasAttribute('role')).toBe(false)
  })

  test('a state that was always there announces nothing, because nothing changed', async () => {
    const empty = await mount('<helix-empty-state no-announce><p>x</p></helix-empty-state>')
    expect(role(empty)).toBeNull()
  })

  test('every region is a bare slot the consumer fills', async () => {
    const empty = await mount(`
      <helix-empty-state>
        <helix-icon slot="icon" name="x"></helix-icon>
        <h2 slot="heading">Nothing here</h2>
        <p>Try another search.</p>
        <span slot="actions">go</span>
      </helix-empty-state>`)
    expect(slotted(empty, 'heading')[0]?.textContent).toBe('Nothing here')
    expect(slotted(empty, 'actions')[0]?.textContent).toBe('go')
  })
})
