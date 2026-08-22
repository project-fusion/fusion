import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('stat group', () => {
  test('is a group rather than a list, because the order carries nothing', async () => {
    // A list would announce "1 of 4" for a set where position is not
    // information.
    const group = await mount(
      '<helix-stat-group label="Scale"><helix-stat><span>1</span></helix-stat></helix-stat-group>',
    )
    expect(role(group)).toBe('group')
    expect(group.hasAttribute('role')).toBe(false)
  })
})
