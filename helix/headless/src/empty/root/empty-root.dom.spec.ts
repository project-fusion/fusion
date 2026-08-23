import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('empty view', () => {
  test('announces itself, because it usually replaces something that was loading', async () => {
    // Otherwise a screen-reader user is left waiting for a search result that
    // already came back with nothing.
    const empty = await mount('<helix-base-empty><p>No results.</p></helix-base-empty>')
    expect(role(empty)).toBe('status')
    expect(empty.hasAttribute('role')).toBe(false)
  })

  test('a state that was always there announces nothing, because nothing changed', async () => {
    const empty = await mount('<helix-base-empty no-announce><p>x</p></helix-base-empty>')
    expect(role(empty)).toBeNull()
  })

  test('every region is a bare slot the consumer fills', async () => {
    const empty = await mount(`
      <helix-base-empty>
        <helix-base-icon slot="icon" name="x"></helix-base-icon>
        <h2 slot="heading">Nothing here</h2>
        <p>Try another search.</p>
        <span slot="actions">go</span>
      </helix-base-empty>`)
    expect(slotted(empty, 'heading')[0]?.textContent).toBe('Nothing here')
    expect(slotted(empty, 'actions')[0]?.textContent).toBe('go')
  })
})
