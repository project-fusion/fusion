import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-stat>
    <span slot="label">Revenue</span>
    <span>42</span>
    <span slot="unit">M</span>
    <span slot="detail">up 12%</span>
  </helix-stat>`

describe('stat', () => {
  test('every region is a bare slot the consumer fills', async () => {
    // The reference ships a `stat-label` and a `stat-value` whose only job is to
    // assign themselves a slot on connect. That is a component for something
    // the consumer can write, and it writes to its own host after upgrading.
    const stat = await mount(markup)
    expect(slotted(stat, 'label')[0]?.textContent).toBe('Revenue')
    expect(slotted(stat)[0]?.textContent).toBe('42')
    expect(slotted(stat, 'unit')[0]?.textContent).toBe('M')
    expect(slotted(stat, 'detail')[0]?.textContent).toBe('up 12%')
  })

  test('an omitted region costs nothing', async () => {
    const stat = await mount('<helix-stat><span>42</span></helix-stat>')
    expect(slotted(stat, 'unit')).toHaveLength(0)
    expect(slotted(stat, 'detail')).toHaveLength(0)
  })
})
