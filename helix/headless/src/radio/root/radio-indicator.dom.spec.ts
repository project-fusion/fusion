import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('a radio with its own indicator', () => {
  test('says so from its first render, which a hydrated radio needs', async () => {
    /* A server's slots are filled before the listener is bound, so the
       `slotchange` that sets this has already gone by the time it could be
       heard. The radio reads the slot once it is drawn. */
    const host = await mount(
      '<helix-headless-radio value="a"><i slot="indicator"></i>Alpha</helix-headless-radio>',
    )
    expect(hasState(host, 'has-indicator')).toBe(true)
    const bare = await mount('<helix-headless-radio value="b">Beta</helix-headless-radio>')
    expect(hasState(bare, 'has-indicator')).toBe(false)
  })
})
