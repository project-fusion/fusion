import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

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

  test('every cell says what it is worth, so a pointer resting on one has an answer', async () => {
    const element = await strip('', [['Mon', 0.81]])
    expect(cells(element)[0]?.getAttribute('title')).toBe('Mon: 0.81')
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
    expect(part(element, 'strip')?.getAttribute('style')).toContain('--_heatmap-rows: 7')
  })

  test('nonsense is one row rather than a broken grid', async () => {
    const element = await strip('rows="0"', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('style')).toContain('--_heatmap-rows: 1')
  })
})
