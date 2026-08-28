import { beforeAll, describe, expect, test } from 'bun:test'
import { arrowDown, arrowUp, minus } from '@fusion.dev/helix-icons'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

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
 * The mark was a `<helix-headless-icon name="arrow-up">` and is now an inlined `<svg>`
 * from a named import, so there is no name to read: the element indexed the
 * whole icon set at runtime and shipped all of it to every consumer. What
 * identifies a glyph now is the path it draws, which is what the import
 * carries. */
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
    /* A coloured arrow says nothing to a reader who is not looking at it. The
       word is clipped out of sight by the styled tier and stays in the
       accessibility tree, which `display: none` would not. */
    expect(word(await trend('direction="up"'))).toBe('Up')
    expect(word(await trend('direction="down"'))).toBe('Down')
    expect(arrow(await trend('direction="up"'))).toBe('arrow-up')
    expect(arrow(await trend('direction="down"'))).toBe('arrow-down')
  })

  test('nothing to report is neutral, and so is a word nobody recognises', async () => {
    // An attribute is a string and a consumer can write anything into it, so an
    // unrecognised direction has to draw something rather than throw in render.
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

  test('an unchanged measurement is neither, whatever good says', async () => {
    expect(word(await trend('direction="neutral" good="up"'))).toBe('Unchanged')
    expect(word(await trend('good="down"'))).toBe('Unchanged')
  })

  test('both properties reflect, since the stylesheet reads the pair', async () => {
    const host = (await trend('')) as HTMLElement & { direction?: string; good?: string }
    expect(host.hasAttribute('direction')).toBe(false)
    expect(host.hasAttribute('good')).toBe(false)
    host.direction = 'down'
    host.good = 'down'
    await host.updateComplete
    expect(host.getAttribute('direction')).toBe('down')
    expect(host.getAttribute('good')).toBe('down')
  })
})
