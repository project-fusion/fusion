import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('flex', () => {
  test('renders its children through a single default slot', async () => {
    const flex = await mount('<helix-flex><span>a</span><span>b</span></helix-flex>')
    expect(slotted(flex)).toHaveLength(2)
  })

  test('presentation only, so it takes no role', async () => {
    // A stack of boxes is not a list and not a group. Announcing it as either
    // would put a landmark in front of content that has none.
    const flex = await mount('<helix-flex><span>a</span></helix-flex>')
    expect(flex.getAttribute('role')).toBeNull()
  })
})
