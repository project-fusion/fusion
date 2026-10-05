import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

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

describe('wrap', () => {
  test('is a switch with one named value, read and written back as written', async () => {
    const flex = (await mount('<helix-flex wrap="reverse">x</helix-flex>')) as HTMLElement & {
      wrap: boolean | 'reverse'
      updateComplete: Promise<boolean>
    }
    expect(flex.wrap).toBe('reverse')
    flex.wrap = true
    await flex.updateComplete
    expect(flex.getAttribute('wrap')).toBe('')
    flex.wrap = false
    await flex.updateComplete
    expect(flex.hasAttribute('wrap')).toBe(false)
  })
})

/* Browser only: what is asserted is the computed layout. */
const laid = hasLayout() ? test : (): void => {}

describe('flex layout', () => {
  laid('the reverse directions and wrap set the properties they are named for', async () => {
    const flex = await mount('<helix-flex direction="row-reverse" wrap="reverse">x</helix-flex>')
    expect(getComputedStyle(flex).flexDirection).toBe('row-reverse')
    expect(getComputedStyle(flex).flexWrap).toBe('wrap-reverse')
    const column = await mount('<helix-flex direction="column-reverse" wrap>x</helix-flex>')
    expect(getComputedStyle(column).flexDirection).toBe('column-reverse')
    expect(getComputedStyle(column).flexWrap).toBe('wrap')
  })

  laid('each axis takes its own gap, and `gap` fills the axis left unset', async () => {
    const both = await mount('<helix-flex gap="lg">x</helix-flex>')
    const lg = getComputedStyle(both).rowGap
    const split = await mount('<helix-flex gap="lg" column-gap="none">x</helix-flex>')
    expect(getComputedStyle(split).rowGap).toBe(lg)
    expect(getComputedStyle(split).columnGap).toBe('0px')
    const rows = await mount('<helix-flex row-gap="lg">x</helix-flex>')
    expect(getComputedStyle(rows).rowGap).toBe(lg)
    expect(getComputedStyle(rows).columnGap).toBe('0px')
  })

  laid('a flex inside another takes none of its gaps', async () => {
    const outer = await mount(
      '<helix-flex gap="lg" row-gap="xl"><helix-flex>x</helix-flex></helix-flex>',
    )
    const inner = outer.querySelector('helix-flex') as HTMLElement
    expect(getComputedStyle(inner).rowGap).toBe('0px')
    expect(getComputedStyle(inner).columnGap).toBe('0px')
  })

  laid('align-content spreads the lines of a wrapping row', async () => {
    const flex = await mount('<helix-flex wrap align-content="between">x</helix-flex>')
    expect(getComputedStyle(flex).alignContent).toBe('space-between')
  })

  laid('a pattern sets what it needs, and an attribute written beside it wins', async () => {
    const split = await mount('<helix-flex layout="split">x</helix-flex>')
    expect(getComputedStyle(split).justifyContent).toBe('space-between')
    expect(getComputedStyle(split).flexWrap).toBe('wrap')
    expect(getComputedStyle(split).alignItems).toBe('center')
    const start = await mount('<helix-flex layout="cluster" align-items="start">x</helix-flex>')
    expect(getComputedStyle(start).alignItems).toBe('flex-start')
  })

  /* The description once said the rest were pushed to the end, and a third
     item sat midway instead. The words now say what the layout does. */
  laid(
    'split puts the first item at the start, the last at the end, and spaces any between',
    async () => {
      const row = await mount(
        '<helix-flex layout="split" style="inline-size: 600px"><i style="inline-size: 50px; display: block">a</i><i style="inline-size: 50px; display: block">b</i><i style="inline-size: 50px; display: block">c</i></helix-flex>',
      )
      const start = row.getBoundingClientRect().left
      const lefts = [...row.querySelectorAll('i')].map((item) =>
        Math.round(item.getBoundingClientRect().left - start),
      )
      expect(lefts).toEqual([0, 275, 550])
    },
  )

  laid(
    'flank gives the last item the rest of the row, and stacks the pair when it cannot',
    async () => {
      const wide = await mount(
        '<div style="inline-size: 400px"><helix-flex layout="flank"><span style="inline-size: 40px; display: block">i</span><span>text</span></helix-flex></div>',
      )
      const [fixed, rest] = [...wide.querySelectorAll('span')] as HTMLElement[]
      expect(Math.round((fixed as HTMLElement).getBoundingClientRect().width)).toBe(40)
      expect(Math.round((rest as HTMLElement).getBoundingClientRect().width)).toBe(360)
      const narrow = await mount(
        '<div style="inline-size: 100px"><helix-flex layout="flank" style="--flex-flank-size: 70px"><span>i</span><span>text</span></helix-flex></div>',
      )
      const [a, b] = [...narrow.querySelectorAll('span')] as HTMLElement[]
      expect((b as HTMLElement).getBoundingClientRect().top).toBeGreaterThan(
        (a as HTMLElement).getBoundingClientRect().top,
      )
    },
  )
})
