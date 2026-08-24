import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@helix-io/testing/dom'

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
    /* `role()` reads `ElementInternals` first, which is the channel every
       component in this library sets a role through: `getAttribute('role')` is
       null on a `helix-list` that announces itself as a list, so the assertion
       was blind to the only way it could have failed. */
    const flex = await mount('<helix-flex><span>a</span></helix-flex>')
    expect(role(flex)).toBeNull()
  })
})
