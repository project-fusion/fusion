import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* The strip, after hydration.
 *
 * The bucketing and the fitting arithmetic are held by `buckets.pure.spec.ts`.
 * What is here is what only exists once there is a DOM: that the table in the
 * light DOM is the data, that a cell's own tone reaches the cell, and that the
 * count of drawn cells is published rather than kept, which is the one fault in
 * this component a picture cannot show. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Strip extends HTMLElement {
  gap: number
  minCell: number
  rows: number
  updateComplete: Promise<unknown>
  visible: number
}

const table = (readings: Array<[string, number, string?]>) =>
  `<table id="uptime" data-hidden-visually>
    <caption>Uptime</caption>
    <tbody>
      ${readings
        .map(
          ([label, value, tone]) =>
            `<tr><th scope="row">${label}</th><td data-value="${value}"${
              tone ? ` data-tone="${tone}"` : ''
            }>${value}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>`

/**
 * The table is a sibling named by `for`, which is every chart's convention here.
 *
 * Not a slotted child, which is what this spec first assumed and what produced
 * an empty strip and no clue why: `SourceController` resolves an id through
 * `getRootNode()`, so a `<table>` inside the element is invisible to it.
 */
const strip = async (attributes: string, readings: Array<[string, number, string?]>) => {
  const host = (await mount(
    `<div>${table(readings)}<helix-headless-heatmap for="uptime" ${attributes}></helix-headless-heatmap></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-heatmap') as Strip
  await element.updateComplete
  return element
}

const cells = (element: HTMLElement) => [
  ...(element.shadowRoot?.querySelectorAll('[part="cell"]') ?? []),
]

describe('the footer', () => {
  /**
   * A footer nobody filled is not laid out, and the element is what says so.
   *
   * The stylesheet asked with `:not(:has(slot:has(*)))` and could not: `:has()`
   * may not be nested inside `:has()`, so the rule never parsed at all, and a
   * slot's assigned nodes are not its DOM children, so the inner test was about
   * fallback content rather than the fill. A strip with no legend still reserved
   * the row for one.
   */
  test('is hidden while none of its three slots holds anything', async () => {
    const element = await strip('', [['Mon', 1]])
    expect(part(element, 'footer')?.hasAttribute('data-empty')).toBe(true)
    expect(part(element, 'footer')?.hasAttribute('hidden')).toBe(true)
  })

  test('is laid out as soon as one of them does', async () => {
    const host = (await mount(
      `<div><table id="uptime" data-hidden-visually><caption>Uptime</caption><tbody>
        <tr><th scope="row">Mon</th><td data-value="1">1</td></tr>
      </tbody></table>
      <helix-headless-heatmap for="uptime"><span slot="summary">Last week</span></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Strip
    await element.updateComplete
    expect(part(element, 'footer')?.hasAttribute('data-empty')).toBe(false)
    expect(part(element, 'footer')?.hasAttribute('hidden')).toBe(false)
  })
})

describe('the data comes from the table', () => {
  test('one cell per reading', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 0],
      ['Wed', 1],
    ])
    expect(cells(element)).toHaveLength(3)
  })

  /**
   * The table is the accessible representation and is already in the markup, so
   * the drawing is a picture of it and takes `role="img"` with a name. A grid of
   * ninety spans with no name is ninety things a screen reader has to walk.
   */
  test('the strip is a named picture, since the table beside it is the reading', async () => {
    const element = await strip('label="Uptime"', [['Mon', 1]])
    expect(role(element)).toBe('img')
  })

  test('an empty table says so rather than drawing nothing', async () => {
    const element = (await mount('<helix-headless-heatmap></helix-headless-heatmap>')) as Strip
    await element.updateComplete
    expect(part(element, 'empty')).not.toBeNull()
  })
})

describe('tones', () => {
  test("a cell's own tone reaches the cell", async () => {
    const element = await strip('', [
      ['Mon', 1, 'success'],
      ['Tue', 0, 'danger'],
    ])
    expect(cells(element).map((cell) => cell.getAttribute('data-tone'))).toEqual([
      'success',
      'danger',
    ])
  })

  test('thresholds color a cell that carries no tone of its own', async () => {
    const element = await strip('thresholds="0 5" tones="muted accent"', [
      ['Mon', 1],
      ['Tue', 9],
    ])
    expect(cells(element).map((cell) => cell.getAttribute('data-tone'))).toEqual([
      'muted',
      'accent',
    ])
  })

  test('with neither, a cell carries no tone rather than an empty one', async () => {
    const element = await strip('', [['Mon', 1]])
    expect(cells(element)[0]?.hasAttribute('data-tone')).toBe(false)
  })

  /**
   * **The bubble is one element that moves, not one per cell.** Every other
   * chart here anchors a single `Tooltip` to an invisible mark, so this does
   * too, rather than leaving a pointer the platform's own `title` box: that
   * arrives after a second of delay and carries the two values this component
   * happens to hold rather than the row the table holds.
   */
  test('a pointer resting on a cell summons one bubble, over that cell', async () => {
    const element = await strip('', [
      ['Mon', 0.81],
      ['Tue', 1],
    ])
    expect(element.shadowRoot?.querySelector('[part="mark"]')).toBeNull()

    cells(element)[1]?.dispatchEvent(new Event('pointerover', { bubbles: true, composed: true }))
    await element.updateComplete

    const marks = element.shadowRoot?.querySelectorAll('[part="mark"]') ?? []
    expect(marks).toHaveLength(1)
    expect(part(element, 'tooltip-label')?.textContent).toBe('Tue')

    part(element, 'strip')?.dispatchEvent(new Event('pointerleave'))
    await element.updateComplete
    expect(element.shadowRoot?.querySelector('[part="mark"]')).toBeNull()
  })

  /**
   * The strip draws a tail of the readings and `sourceRows` is indexed over all
   * of them, so the two agree only when nothing was dropped. Off by the length
   * of the cut, the bubble names a day that is still on screen, so nothing about
   * it looks wrong.
   */
  test('the bubble names the reading under the pointer, not the one that index was before the cut', async () => {
    const element = await strip('min-cell="10" gap="0"', [
      ['Mon', 1],
      ['Tue', 2],
      ['Wed', 3],
      ['Thu', 4],
    ])
    /* Two cells' worth of room, so the first two readings are dropped. */
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 20 })
    element.minCell = 10
    await element.updateComplete

    const drawn = cells(element)
    cells(element)[drawn.length - 1]?.dispatchEvent(
      new Event('pointerover', { bubbles: true, composed: true }),
    )
    await element.updateComplete
    expect(part(element, 'tooltip-label')?.textContent).toBe('Thu')
  })
})

describe('what a narrow container does', () => {
  /**
   * **The fault a screenshot cannot show.** A strip labeled "99.2% over 90 days"
   * that is drawing 45 of them is telling the reader something false about the
   * picture in front of them, and nothing about the picture says so. The count
   * is on the host and the change is announced, because a consumer's summary is
   * their markup and this element cannot rewrite it.
   */
  test('the count of drawn cells is published on the host', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 1],
    ])
    expect(element.getAttribute('visible')).toBe('2')
  })

  /**
   * **The stale-attribute bug this design avoids.**
   * `@property({ reflect: true })` on a getter with no setter reflects once and
   * never again: Lit reflects what is in `changedProperties`, and nothing puts a
   * derived getter there after the first update. The attribute would be right on
   * load and wrong from the first change, which is the exact failure the count
   * exists to prevent arriving through the mechanism meant to prevent it.
   */
  test('the count follows the data rather than being right once', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 1],
    ])
    expect(element.getAttribute('visible')).toBe('2')

    /* Built rather than parsed. `insertAdjacentHTML('beforeend', '<tr>')` on a
       `<tbody>` inserts nothing under happy-dom while still counting as a
       mutation, which `.claude/rules/helix.md` records: the spec would pass on
       the unchanged count and prove nothing. */
    const body = element.parentElement?.querySelector('tbody')
    const row = document.createElement('tr')
    const head = document.createElement('th')
    head.setAttribute('scope', 'row')
    head.textContent = 'Wed'
    const cell = document.createElement('td')
    cell.dataset.value = '1'
    cell.textContent = '1'
    row.append(head, cell)
    body?.append(row)
    element.requestUpdate()
    await element.updateComplete
    expect(element.getAttribute('visible')).toBe('3')
  })

  /**
   * happy-dom has no layout and no `ResizeObserver` measurement, so the width is
   * never measured here and everything is drawn. That is the correct behavior
   * for an unmeasured container and is worth pinning: a first paint that draws
   * one cell and then expands is a flicker on every page load.
   */
  test('an unmeasured container draws everything rather than one cell', async () => {
    const element = await strip('min-cell="8"', [
      ['Mon', 1],
      ['Tue', 1],
      ['Wed', 1],
    ])
    expect(cells(element)).toHaveLength(3)
    expect(element.visible).toBe(3)
  })
})

describe('rows', () => {
  test('the row count reaches the stylesheet, which is the only thing that needs it', async () => {
    const element = await strip('rows="7"', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('style')).toContain('--heatmap-rows: 7')
  })

  test('nonsense is one row rather than a broken grid', async () => {
    const element = await strip('rows="0"', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('style')).toContain('--heatmap-rows: 1')
  })
})
