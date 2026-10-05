import { beforeAll, describe, expect, test } from 'bun:test'
import { arrowDown, arrowUp, minus } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, slotted, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trend = async (attributes: string): Promise<HTMLElement> =>
  mount(
    `<helix-headless-trend ${attributes}>8%<span slot="label">month over month</span></helix-headless-trend>`,
  )

const word = (host: HTMLElement): string => part(host, 'direction')?.textContent?.trim() ?? ''

/* The glyph, by its path rather than by a name.
 *
 * The mark is an inlined `<svg>` from a named import rather than a
 * `<helix-headless-icon name="arrow-up">`, which indexed the whole icon set at
 * runtime and shipped all of it to every consumer. So there is no name to read,
 * and what identifies a glyph is the path it draws. */
const arrow = (host: HTMLElement): string =>
  Object.entries({ 'arrow-down': arrowDown, 'arrow-up': arrowUp, minus }).find(([, icon]) =>
    part(host, 'icon')?.innerHTML.includes(icon.content.slice(0, 40)),
  )?.[0] ?? 'none'

describe('trend', () => {
  test('the metric and the label are bare slots', async () => {
    const host = await trend('direction="up"')
    expect(slotted(host)[0]?.textContent ?? part(host, 'direction')).toBeTruthy()
    expect(slotted(host, 'label')[0]?.textContent).toBe('month over month')
  })

  test('the direction is a word as well as an arrow', async () => {
    /* A colored arrow says nothing to a reader who is not looking at it. The
       word is clipped out of sight by the styled tier and stays in the
       accessibility tree, which `display: none` would not. */
    expect(word(await trend('direction="up"'))).toBe('Up')
    expect(word(await trend('direction="down"'))).toBe('Down')
    expect(arrow(await trend('direction="up"'))).toBe('arrow-up')
    expect(arrow(await trend('direction="down"'))).toBe('arrow-down')
  })

  test('nothing to report is neutral, and so is a word nobody recognizes', async () => {
    // An attribute is a string and a consumer can write anything into it, so an
    // unrecognized direction has to draw something rather than throw in render.
    expect(word(await trend(''))).toBe('Unchanged')
    expect(word(await trend('direction="neutral"'))).toBe('Unchanged')
    expect(word(await trend('direction="sideways"'))).toBe('Unchanged')
    expect(arrow(await trend('direction="sideways"'))).toBe('minus')
  })
})

describe('trend judgment', () => {
  test('a movement is stated and not judged until good says which way is better', async () => {
    /* The default every dashboard gets wrong. Up is green for revenue and a
       lie for churn, latency, error rate and cost, so the component waits to be
       told rather than guessing and being wrong about a third of the time. */
    expect(word(await trend('direction="up"'))).toBe('Up')
    expect(word(await trend('direction="down"'))).toBe('Down')
  })

  test('better when the movement went the good way, worse when it did not', async () => {
    expect(word(await trend('direction="up" good="up"'))).toBe('Up, better')
    expect(word(await trend('direction="down" good="down"'))).toBe('Down, better')
    expect(word(await trend('direction="up" good="down"'))).toBe('Up, worse')
    expect(word(await trend('direction="down" good="up"'))).toBe('Down, worse')
  })

  /* The words were fixed English, so a page in another language announced
     "Up, worse" beside its own copy. */
  test('every word is a property, so a page can say it in its own language', async () => {
    const words =
      'up-label="Hausse" down-label="Baisse" unchanged-label="Stable" better-label="mieux" worse-label="pire"'
    expect(word(await trend(`direction="up" good="down" ${words}`))).toBe('Hausse, pire')
    expect(word(await trend(`direction="down" good="down" ${words}`))).toBe('Baisse, mieux')
    expect(word(await trend(`${words}`))).toBe('Stable')
  })

  test('an unchanged measurement is neither, whatever good says', async () => {
    expect(word(await trend('direction="neutral" good="up"'))).toBe('Unchanged')
    expect(word(await trend('good="down"'))).toBe('Unchanged')
  })

  test('both properties reflect, since the stylesheet reads the pair', async () => {
    const host = (await trend('')) as Updatable & { direction?: string; good?: string }
    expect(host.hasAttribute('direction')).toBe(false)
    expect(host.hasAttribute('good')).toBe(false)
    host.direction = 'down'
    host.good = 'down'
    await host.updateComplete
    expect(host.getAttribute('direction')).toBe('down')
    expect(host.getAttribute('good')).toBe('down')
  })
})

/* The arrow is the `icon` slot's fallback, so a page's own glyph replaces it
   and the word beside it still says the direction. */
describe('an icon of the page', () => {
  test('replaces the arrow, and the direction is still said in words', async () => {
    const host = await mount(
      '<helix-headless-trend direction="up">8%<span slot="icon">^</span></helix-headless-trend>',
    )
    const slot = host.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements()[0]?.textContent).toBe('^')
    expect(slot.querySelector('[part="icon"]')).not.toBeNull()
    expect(word(host)).toBe('Up')
  })

  /* A slotted `^` was read into the name of a button holding the trend, as
     "^ Up, better 8%". The word already says the direction. */
  test('is hidden from screen readers, as the arrow is', async () => {
    const host = await mount(
      '<helix-headless-trend direction="up">8%<span slot="icon">^</span></helix-headless-trend>',
    )
    const slot = host.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.getAttribute('aria-hidden')).toBe('true')
  })

  test('without one, the arrow is drawn as before', async () => {
    const host = await mount('<helix-headless-trend direction="down">8%</helix-headless-trend>')
    const slot = host.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(0)
    expect(part(host, 'icon')?.parentElement).toBe(slot)
  })
})

/* `direction` is a layout on Stat and Flex, which sit beside a trend, so the
   movement has a word of its own. The old one is still read. */
describe('movement', () => {
  type Trend = Updatable & {
    direction?: string
    internals: ElementInternals
    movement?: string
  }

  test('says which way the metric moved, as direction did', async () => {
    expect(word(await trend('movement="up"'))).toBe('Up')
    expect(word(await trend('movement="down" good="down"'))).toBe('Down, better')
    expect(arrow(await trend('movement="down"'))).toBe('arrow-down')
  })

  test('wins over the old direction, which is read only without it', async () => {
    expect(word(await trend('movement="down" direction="up"'))).toBe('Down')
    expect(word(await trend('direction="up"'))).toBe('Up')
  })

  test('reflects, and the host carries nothing until it is set', async () => {
    const host = (await trend('')) as Trend
    expect(host.hasAttribute('movement')).toBe(false)
    host.movement = 'up'
    await host.updateComplete
    expect(host.getAttribute('movement')).toBe('up')
  })

  /* The styled sheet colors on these, so a judgment no longer depends on which
     attribute named the movement. */
  test('records the judgment as a better or worse state, and neither for no move', async () => {
    const states = async (attributes: string): Promise<string[]> => {
      const host = (await trend(attributes)) as Trend
      return ['better', 'worse'].filter((name) => host.internals.states.has(name))
    }
    expect(await states('movement="up" good="up"')).toEqual(['better'])
    expect(await states('direction="up" good="down"')).toEqual(['worse'])
    expect(await states('movement="neutral" good="up"')).toEqual([])
    expect(await states('movement="up"')).toEqual([])
    expect(await states('movement="sideways" good="up"')).toEqual([])
  })
})

/* A slot per movement around the slot for all three, so a page slots its set
   once and the trend shows the glyph that matches. */
describe('an icon per movement', () => {
  const glyphs =
    '<span slot="up-icon">U</span><span slot="down-icon">D</span><span slot="neutral-icon">N</span>'
  const shown = (host: HTMLElement): string[] =>
    [...(host.shadowRoot?.querySelectorAll('slot') ?? [])].flatMap((slot) =>
      slot.assignedElements().map((element) => element.textContent ?? ''),
    )

  test('shows only the glyph for the movement, hidden from screen readers', async () => {
    const up = await mount(`<helix-headless-trend movement="up">8%${glyphs}</helix-headless-trend>`)
    expect(shown(up)).toEqual(['U'])
    expect(up.shadowRoot?.querySelector('slot[name="up-icon"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    const still = await mount(`<helix-headless-trend>8%${glyphs}</helix-headless-trend>`)
    expect(shown(still)).toEqual(['N'])
  })

  test('swaps the glyph when the movement changes', async () => {
    const host = (await mount(
      `<helix-headless-trend movement="up">8%${glyphs}</helix-headless-trend>`,
    )) as Updatable & { movement?: string }
    host.movement = 'down'
    await host.updateComplete
    expect(shown(host)).toEqual(['D'])
  })

  test('falls back to the icon slot, and then to the arrow', async () => {
    const one = await mount(
      '<helix-headless-trend movement="down">8%<span slot="icon">^</span></helix-headless-trend>',
    )
    expect(shown(one)).toEqual(['^'])
    expect(arrow(await trend('movement="down"'))).toBe('arrow-down')
  })
})
