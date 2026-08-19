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
  })

  test('an omitted region costs nothing', async () => {
    const stat = await mount('<helix-stat><span>42</span></helix-stat>')
    expect(slotted(stat, 'unit')).toHaveLength(0)
  })
})

describe('stat direction', () => {
  test('a stat is a label over a number by default', async () => {
    /* The words say what is coming and the number answers, which is how a figure
       is read on a dashboard. The markup order never changes with it: a screen
       reader hears the label first whichever way the pair is drawn. */
    /* Absent rather than `column`, and that is the point: a reflecting property
       with a default writes its attribute onto a host the consumer rendered,
       which React reports as a hydration mismatch. The stylesheet reads the
       absence as the base case. */
    const stat = await mount(markup)
    expect((stat as HTMLElement & { direction?: string }).direction).toBeUndefined()
    expect(stat.hasAttribute('direction')).toBe(false)
  })

  test('and it reflects, so the stylesheet can arrange the pair', async () => {
    const stat = (await mount(
      '<helix-stat direction="row"><span slot="label">Uptime</span><span>98</span></helix-stat>',
    )) as HTMLElement & { direction: string }
    expect(stat.direction).toBe('row')
    expect(stat.getAttribute('direction')).toBe('row')
    // Reversing is a visual order, so the label is still first in the markup.
    expect(slotted(stat, 'label')[0]?.textContent).toBe('Uptime')
  })

  test('there is no second line of words to write', async () => {
    /* A stat is a number and the word for what it measures. A change beside it
       is a second fact and goes beside the stat rather than inside it, which is
       what the group is for. */
    const stat = await mount(markup)
    expect(slotted(stat, 'detail')).toHaveLength(0)
  })
})
