import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  slotted,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-headless-stat>
    <span slot="label">Revenue</span>
    <span>42</span>
    <span slot="unit">M</span>
  </helix-headless-stat>`

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
    const stat = await mount('<helix-headless-stat><span>42</span></helix-headless-stat>')
    expect(slotted(stat, 'unit')).toHaveLength(0)
  })
})

describe('stat direction', () => {
  test('a stat is a label over a number by default', async () => {
    /* The markup order never changes with the visual one: a screen reader hears
       the label first whichever way the pair is drawn. */
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
      '<helix-headless-stat direction="row"><span slot="label">Uptime</span><span>98</span></helix-headless-stat>',
    )) as HTMLElement & { direction: string }
    expect(stat.direction).toBe('row')
    expect(stat.getAttribute('direction')).toBe('row')
    // Reversing is a visual order, so the label is still first in the markup.
    expect(slotted(stat, 'label')[0]?.textContent).toBe('Uptime')
  })

  test('there is no second line of words to write', async () => {
    /* A stat is a number and the word for what it measures. The one second
       fact it takes is how the number moved, a Trend in the `trend` slot, so
       the two are read as one; prose about it goes beside the stat. */
    const stat = await mount(markup)
    expect(slotted(stat, 'detail')).toHaveLength(0)
  })
})

if (hasLayout()) {
  describe('stat unit geometry', () => {
    /* `align-self: baseline` on the unit is not enough. Baseline alignment is
       relative: an item aligns against the others in its baseline-sharing
       group, and one item is not a group, so it falls back to start and sits at
       the top of the number, reading as a superscript. `align-items: baseline`
       on the grid puts the value in the group too, and both readings of the
       value need it.

       Asserted as a distance rather than an equality, because the two are on a
       shared baseline and not a shared bottom edge: the smaller type has the
       shallower descender, so its box ends a few pixels above the number's. Off
       the baseline it was 32.5px out at 14px, which is half the number's own
       height, so the band is wide enough to be robust and far from the bug. */
    const unitAbove = (host: HTMLElement): number => {
      const value = [...host.childNodes].find(
        (node) =>
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) ||
          (node.nodeType === Node.ELEMENT_NODE && !(node as Element).getAttribute('slot')),
      ) as Node
      let box: DOMRect
      if (value.nodeType === Node.ELEMENT_NODE) {
        box = (value as Element).getBoundingClientRect()
      } else {
        const range = document.createRange()
        range.selectNodeContents(value)
        box = range.getBoundingClientRect()
      }
      const unit = host.querySelector('[slot="unit"]') as HTMLElement
      return box.bottom - unit.getBoundingClientRect().bottom
    }

    test('the unit sits on the value baseline, not above it', async () => {
      const bare = await mount(
        '<helix-headless-stat>212<span slot="label">p99</span><span slot="unit">ms</span></helix-headless-stat>',
      )
      expect(unitAbove(bare)).toBeLessThan(12)
    })

    test('and does so whether the value is bare text or wrapped', async () => {
      // A bare value is an anonymous grid item with no element to carry
      // `align-self`; a wrapped one has the element and was broken anyway.
      const wrapped = await mount(
        '<helix-headless-stat><span>212</span><span slot="label">p99</span><span slot="unit">ms</span></helix-headless-stat>',
      )
      expect(unitAbove(wrapped)).toBeLessThan(12)
    })
  })
}

describe('a direction meant for Trend', () => {
  /* A Stat and a Trend sit side by side, and `up` lays out nothing on a Stat. */
  test('is reported, and a layout direction is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount('<helix-headless-stat direction="up">42</helix-headless-stat>')
      await mount('<helix-headless-stat direction="row">42</helix-headless-stat>')
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('helix-trend')
  })
})

/* A value written as text has no element of its own to style, so the slot it
   arrives through is the part. */
describe('the value part', () => {
  test('is the slot the value arrives through, drawing no box of its own', async () => {
    const stat = await mount('<helix-headless-stat>4,210</helix-headless-stat>')
    const value = stat.shadowRoot?.querySelector('[part="value"]')
    expect(value?.tagName).toBe('SLOT')
    expect((value as HTMLSlotElement).assignedNodes()[0]?.textContent).toBe('4,210')
  })
})

/* A lone stat was a run of loose words to a reader: "Revenue", "42", "M". With
   a label it is a group named by it, and a trend in its slot is read inside. */
describe('a stat with a label', () => {
  type Stat = Updatable & { internals: ElementInternals }

  test('is a group named by the label', async () => {
    const stat = (await mount(markup)) as Stat
    await stat.updateComplete
    expect(stat.internals.role).toBe('group')
    const reflected = (stat.internals as ElementInternals & { ariaLabelledByElements?: Element[] })
      .ariaLabelledByElements
    const name = reflected ? reflected.map((element) => element.textContent).join(' ') : ''
    expect(name || stat.internals.ariaLabel).toBe('Revenue')
  })

  test('without a label, has no role', async () => {
    const stat = (await mount('<helix-headless-stat>42</helix-headless-stat>')) as Stat
    await stat.updateComplete
    expect(stat.internals.role ?? null).toBeNull()
  })

  test('a label arriving later names it', async () => {
    const stat = (await mount('<helix-headless-stat>42</helix-headless-stat>')) as Stat
    const label = document.createElement('span')
    label.slot = 'label'
    label.textContent = 'Orders'
    stat.append(label)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await stat.updateComplete
    expect(stat.internals.role).toBe('group')
  })

  test('takes a trend in a slot of its own, after the value and the unit', async () => {
    const stat = await mount(
      '<helix-headless-stat>42<span slot="label">Revenue</span><span slot="trend">Up 8%</span></helix-headless-stat>',
    )
    expect(slotted(stat, 'trend')[0]?.textContent).toBe('Up 8%')
    const names = [...(stat.shadowRoot?.querySelectorAll('slot') ?? [])].map(
      (slot) => slot.getAttribute('name') ?? '',
    )
    expect(names).toEqual(['label', '', 'unit', 'trend'])
  })
})
