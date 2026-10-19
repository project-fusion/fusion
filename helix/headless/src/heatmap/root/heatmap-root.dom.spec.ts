import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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
  requestUpdate: () => void
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
  ...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? []),
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
   *
   * On the strip, because on the host the footer's slots were inside an
   * image, whose children are presentational.
   */
  /* A strip with cells is read by key, so it takes focus as an application, the
     role every chart's plot takes; an empty one is still a picture. */
  test('the strip is named, and is read by key once it has cells', async () => {
    const element = await strip('label="Uptime"', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('role')).toBe('application')
    expect(part(element, 'strip')?.getAttribute('tabindex')).toBe('0')
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime')
    expect(role(element)).toBeNull()
  })

  /* The charting docs promise a caption names the chart unless `label` is set.
     The strip was named 'Heatmap' whatever the caption said. */
  test('and the caption of the table names it where no label is set', async () => {
    const element = await strip('', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime')
  })

  /* While the host was the image, its own `aria-label` named the picture. The
     host is a generic now, so the name reached nobody until the strip took
     it. It wins over `label`, as it did then. */
  test('an aria-label on the host names it, and follows the attribute', async () => {
    const element = await strip('label="Uptime" aria-label="Uptime this week"', [['Mon', 1]])
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime this week')

    element.setAttribute('aria-label', 'Uptime last week')
    await element.updateComplete
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime last week')

    element.removeAttribute('aria-label')
    await element.updateComplete
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime')
  })

  test('an aria-labelledby on the host names it too', async () => {
    const element = await strip('aria-labelledby="heading"', [['Mon', 1]])
    element.insertAdjacentHTML('beforebegin', '<h2 id="heading">Service uptime</h2>')
    /* happy-dom has no ARIA element reflection, so the accessor is stood in. */
    const picture = part(element, 'strip') as HTMLElement & Record<string, unknown>
    if (!('ariaLabelledByElements' in picture)) {
      Object.defineProperty(picture, 'ariaLabelledByElements', { value: null, writable: true })
    }
    ;(element as Strip).requestUpdate()
    await element.updateComplete
    const named = (picture.ariaLabelledByElements as Element[] | null) ?? []
    expect(named.map((one) => one.textContent)).toEqual(['Service uptime'])
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

    cells(element)[1]?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
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
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
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

/* A blank keeps its place. Taken from the series alone, a blank dropped its day
   and every day after it moved a cell along, while the tooltip still counted
   rows and named the day beside the one under the pointer. */
describe('a blank cell', () => {
  const GAP = `<table id="uptime">
    <tbody>
      <tr><th>Mon</th><td>99</td></tr>
      <tr><th>Tue</th><td></td></tr>
      <tr><th>Wed</th><td>50</td></tr>
    </tbody>
  </table>`

  test('is a cell with no tone, and the days after it keep theirs', async () => {
    const host = (await mount(
      `<div>${GAP}<helix-headless-heatmap for="uptime" thresholds="0 90" tones="danger success"></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Strip
    await element.updateComplete
    expect(cells(element).map((cell) => cell.getAttribute('data-tone'))).toEqual([
      'success',
      null,
      'danger',
    ])
  })

  test('and the tooltip over the day after it names that day', async () => {
    const host = (await mount(
      `<div>${GAP}<helix-headless-heatmap for="uptime"></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Strip
    await element.updateComplete
    cells(element)[2]?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    await element.updateComplete
    expect(element.shadowRoot?.querySelector('[part="tooltip-label"]')?.textContent).toBe('Wed')
  })
})

/* A touch has no hover: heard, it opened the bubble under the finger and left
   it there after the finger lifted, which the other charts never do. */
describe('a touch', () => {
  test('does not open the tooltip', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 2],
    ])
    cells(element)[1]?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'touch' }),
    )
    await element.updateComplete
    expect(element.shadowRoot?.querySelector('[part="tooltip-label"]')).toBeNull()
  })
})

describe('reading by key', () => {
  const press = (element: HTMLElement, key: string): void => {
    part(element, 'strip')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
  }

  test('the arrows move a cell, the readout says its row, and the cell is marked', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 2],
    ])
    press(element, 'End')
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toBe('Tue: 2 (2 of 2)')
    expect(cells(element).map((one) => one.getAttribute('part'))).toEqual([
      'cell',
      'cell cell-active',
    ])
  })

  /* `rows="7"` stands a week to a column, so the across arrows move a week. */
  test('a column at a time across, in a calendar', async () => {
    const days = Array.from({ length: 14 }, (_, day) => [`Day ${day + 1}`, day] as [string, number])
    const element = await strip('rows="7"', days)
    press(element, 'Home')
    press(element, 'ArrowRight')
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toBe('Day 8: 7 (8 of 14)')
  })
})

/* Every other chart says what it shows in a summary; a strip said nothing of
   its own, and a reader had to walk ninety cells to find the busiest. */
describe('the overview', () => {
  test('says the busiest reading and the total, and describes the strip', async () => {
    const element = await strip('locale="en"', [
      ['Mon', 3],
      ['Tue', 1200],
      ['Wed', 40],
    ])
    expect(part(element, 'overview')?.textContent).toBe('Busiest: Tue, 1200; Total 1,243.')
    expect(part(element, 'strip')?.getAttribute('aria-describedby')).toBe('helix-chart-summary')
    expect(part(element, 'overview')?.id).toBe('helix-chart-summary')
  })

  test('in words the page can change', async () => {
    const element = await strip('busiest-label="Höchster" total-label="Summe" locale="de"', [
      ['Mo', 1500],
      ['Di', 2],
    ])
    expect(part(element, 'overview')?.textContent).toBe('Höchster: Mo, 1500; Summe 1.502.')
  })

  test('is not there while the strip has nothing to read', async () => {
    const element = await strip('', [])
    expect(part(element, 'overview')).toBeNull()
  })
})

describe('a page of cells by key', () => {
  test('PageDown moves four columns, four weeks in a calendar', async () => {
    const days = Array.from({ length: 70 }, (_, day) => [`Day ${day + 1}`, day] as [string, number])
    const element = await strip('rows="7" min-cell="0"', days)
    for (const key of ['Home', 'PageDown']) {
      part(element, 'strip')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
    }
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toBe('Day 29: 28 (29 of 70)')
  })
})

/* No peer ships a heatmap, and this one could only be read: a reader could
   not pick a day or a range, which every other set of items here allows. */
describe('selecting cells', () => {
  type Selecting = Strip & { value: string }
  const key = (element: HTMLElement, name: string, shiftKey = false): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      shiftKey,
    })
    part(element, 'strip')?.dispatchEvent(event)
    return event
  }
  const WEEK: Array<[string, number]> = [
    ['Mon', 1],
    ['Tue', 2],
    ['Wed', 3],
    ['Thu', 4],
  ]
  const selected = (element: HTMLElement): string[] =>
    cells(element)
      .filter((one) => (one.getAttribute('part') ?? '').includes('cell-selected'))
      .map((one) => one.getAttribute('data-index') ?? '')

  test('Space selects the cell the keys rest on, asking first and telling after', async () => {
    const element = (await strip('selection-mode="single"', WEEK)) as Selecting
    const heard: string[] = []
    element.addEventListener('helix-before-change', (event) =>
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}`),
    )
    element.addEventListener('change', () => heard.push(`change ${element.value}`))
    key(element, 'Home')
    key(element, 'ArrowRight')
    expect(key(element, ' ').defaultPrevented).toBe(true)
    await element.updateComplete
    expect([element.value, heard, selected(element)]).toEqual([
      'Tue',
      ['before Tue', 'change Tue'],
      ['1'],
    ])
  })

  test('Shift with an arrow takes in a range under `multiple`, and the count is said', async () => {
    const element = (await strip('selection-mode="multiple"', WEEK)) as Selecting
    key(element, 'Home')
    key(element, ' ')
    key(element, 'ArrowRight', true)
    key(element, 'ArrowRight', true)
    await element.updateComplete
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await element.updateComplete
    expect(element.value).toBe('Mon, Tue, Wed')
    expect(part(element, 'selection')?.textContent).toBe('3 selected')
  })

  test('a press selects the cell under it, and a refused change keeps the selection', async () => {
    const element = (await strip('selection-mode="multiple" value="Mon"', WEEK)) as Selecting
    ;(cells(element)[2] as HTMLElement).click()
    await element.updateComplete
    expect(element.value).toBe('Mon, Wed')
    element.addEventListener('helix-before-change', (event) => event.preventDefault())
    ;(cells(element)[0] as HTMLElement).click()
    expect(element.value).toBe('Mon, Wed')
  })

  /* The count says how many, and each cell says whether it is in the
     selection: under `selection-mode` the strip is a grid, its cells
     gridcells carrying `aria-selected`, and the keys move its active
     descendant. Said in live text only, the selection was words and no state. */
  test('is a grid whose cells say whether they are selected', async () => {
    const element = (await strip('selection-mode="multiple"', WEEK)) as Selecting
    const plot = part(element, 'strip')
    expect(plot?.getAttribute('role')).toBe('grid')
    expect(plot?.getAttribute('aria-multiselectable')).toBe('true')
    expect(part(element, 'row')?.getAttribute('role')).toBe('row')
    key(element, 'Home')
    key(element, ' ')
    await element.updateComplete
    const active = element.shadowRoot?.getElementById(
      plot?.getAttribute('aria-activedescendant') ?? '',
    )
    expect(active?.getAttribute('role')).toBe('gridcell')
    expect(active?.getAttribute('aria-label')).toBe('Mon: 1')
    expect(cells(element).map((one) => one.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ])
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(plot?.getAttribute('aria-activedescendant')).toBe('cell-1')
    // The active cell is what a reader hears, so the readout is not drawn.
    expect(part(element, 'live')).toBeNull()
  })

  test('says one at a time under `single`, and is no grid without a mode', async () => {
    const single = await strip('selection-mode="single"', WEEK)
    expect(part(single, 'strip')?.getAttribute('role')).toBe('grid')
    expect(part(single, 'strip')?.hasAttribute('aria-multiselectable')).toBe(false)
    const plain = await strip('', WEEK)
    expect(part(plain, 'strip')?.getAttribute('role')).toBe('application')
    expect(part(plain, 'row')).toBeNull()
    expect(cells(plain).some((one) => one.hasAttribute('role'))).toBe(false)
  })

  /* The value named each day by its header's words, "1 Jun", where the
     header carried the date itself in a `<time datetime>`. */
  test('names a day by its `<time datetime>` where the row carries one', async () => {
    const rows = ['2026-06-01', '2026-06-02', '2026-06-03']
      .map(
        (date, day) =>
          `<tr><th scope="row"><time datetime="${date}">${day + 1} Jun</time></th><td>${day}</td></tr>`,
      )
      .join('')
    const host = (await mount(
      `<div><table id="june"><tbody>${rows}</tbody></table><helix-headless-heatmap for="june" selection-mode="multiple" value="2026-06-01"></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Selecting
    await element.updateComplete
    expect(selected(element)).toEqual(['0'])
    ;(cells(element)[2] as HTMLElement).click()
    await element.updateComplete
    expect(element.value).toBe('2026-06-01, 2026-06-03')
  })

  test('selects nothing without `selection-mode`', async () => {
    const element = (await strip('', WEEK)) as Selecting
    key(element, 'Home')
    key(element, ' ')
    ;(cells(element)[1] as HTMLElement).click()
    expect(element.value).toBe('')
  })
})

/* APG's date grid moves a month with PageUp and PageDown; the strip moved
   four weeks, landing on another day of the month. */
describe('a month by key', () => {
  test('PageDown goes to the same day a month on where the rows carry dates', async () => {
    const rows = Array.from({ length: 70 }, (_, day) => {
      const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10)
      return `<tr><th scope="row"><time datetime="${date}">${date}</time></th><td>${day}</td></tr>`
    }).join('')
    const host = (await mount(
      `<div><table id="days"><tbody>${rows}</tbody></table><helix-headless-heatmap for="days" rows="7" min-cell="0"></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Strip
    await element.updateComplete
    for (const key of ['Home', 'ArrowDown', 'PageDown']) {
      part(element, 'strip')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
    }
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toBe('2026-02-02: 32 (33 of 70)')
  })
})

/* Drawn from data, the strip had no table on the page for a screen reader. */
describe('a strip drawn from data', () => {
  test('renders its readings as a table', async () => {
    const element = (await mount('<helix-headless-heatmap></helix-headless-heatmap>')) as Strip & {
      data: unknown
    }
    element.data = {
      columns: ['Day', 'Deploys'],
      rows: [
        ['Mon', 2],
        ['Tue', 5],
      ],
    }
    await element.updateComplete
    const rows = [...(part(element, 'table')?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
      [...tr.children].map((cell) => cell.textContent),
    )
    expect(rows).toEqual([
      ['Mon', '2'],
      ['Tue', '5'],
    ])
  })
})

/* Every other chart says it is waiting with `loading` and takes markup in
   place of its empty and loading words; the strip had its own empty line and
   no way to say it was waiting. */
describe('nothing to draw', () => {
  test('`loading` shows its words, or what a page slotted, until readings arrive', async () => {
    const element = await strip('loading', [])
    expect(part(element, 'loading')?.textContent?.trim()).toBe('Loading readings')
    expect(hasState(element, 'loading')).toBe(true)
    expect(part(element, 'empty')).toBeNull()
    const slotted = (await mount(
      `<div>${table([])}<helix-headless-heatmap for="uptime" loading><span slot="loading">Fetching</span></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const host = slotted.querySelector('helix-headless-heatmap') as Strip
    await host.updateComplete
    expect(part(host, 'loading')?.querySelector('slot[name="loading"]')).not.toBeNull()
  })

  test('a table with no readings shows the empty words in their slot, and a loaded strip keeps its cells', async () => {
    const empty = await strip('', [])
    expect(part(empty, 'empty')?.querySelector('slot[name="empty"]')?.textContent).toBe(
      'No readings',
    )
    expect(hasState(empty, 'empty')).toBe(true)
    const refreshing = await strip('loading', [['Mon', 1]])
    expect(cells(refreshing)).toHaveLength(1)
    expect(part(refreshing, 'loading')).toBeNull()
  })
})

/* The other charts send `helix-reading-change` and `helix-reading-press`; the
   strip sent neither, so a page wiring one handler across its charts heard
   nothing from it. */
describe('readings, as every chart sends them', () => {
  const heard = (element: HTMLElement): string[] => {
    const said: string[] = []
    for (const type of ['helix-reading-change', 'helix-reading-press']) {
      element.addEventListener(type, (event) => {
        const { index, label, pointerType } = (
          event as CustomEvent<{ index: number; label: string; pointerType: string }>
        ).detail
        said.push(`${type.slice(14)} ${index} ${label} ${pointerType}`)
      })
    }
    return said
  }

  test('a move by key and a press, with the row and its label', async () => {
    const element = await strip('', [
      ['Mon', 1],
      ['Tue', 2],
    ])
    const said = heard(element)
    for (const key of ['Home', 'ArrowDown', 'Enter']) {
      part(element, 'strip')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
      await element.updateComplete
    }
    expect(said).toEqual(['change 0 Mon keyboard', 'change 1 Tue keyboard', 'press 1 Tue keyboard'])
  })

  test('the row of the table, where a narrow strip drew only the newest', async () => {
    const days = Array.from({ length: 40 }, (_, day) => [`Day ${day + 1}`, day] as [string, number])
    const element = await strip('min-cell="10"', days)
    ;(element as unknown as { width: number }).width = 100
    await element.updateComplete
    const drawn = cells(element).length
    expect(drawn).toBeLessThan(40)
    const said = heard(element)
    part(element, 'strip')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Home',
      }),
    )
    await element.updateComplete
    expect(said).toEqual([`change ${40 - drawn} Day ${41 - drawn} keyboard`])
  })
})

/* A calendar's selection was a run of days in the table's order, so a reader
   could not take in the same weekdays across weeks. `selection-shape` asks for
   a rectangle instead: the rows and columns between two corners, as a
   spreadsheet takes a range. */
describe('a rectangle of cells', () => {
  type Selecting = Strip & { value: string }
  const DAYS = (count: number) =>
    Array.from({ length: count }, (_, day) => [`Day ${day + 1}`, day] as [string, number])
  const key = (element: HTMLElement, name: string, shiftKey = false): void => {
    part(element, 'strip')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: name,
        shiftKey,
      }),
    )
  }
  const click = (element: HTMLElement, index: number, modifiers: MouseEventInit = {}): void => {
    cells(element)[index]?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...modifiers }),
    )
  }
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))
  const selected = (element: HTMLElement): number[] =>
    cells(element).flatMap((one, index) =>
      one.getAttribute('aria-selected') === 'true' ? [index] : [],
    )

  test('is not the default: Shift with an arrow still takes in the days between', async () => {
    for (const shape of ['', 'selection-shape="linear"']) {
      const element = (await strip(
        `rows="7" selection-mode="multiple" ${shape}`,
        DAYS(21),
      )) as Selecting
      key(element, 'Home')
      key(element, ' ')
      key(element, 'ArrowRight', true)
      await element.updateComplete
      expect(element.value).toBe('Day 1, Day 2, Day 3, Day 4, Day 5, Day 6, Day 7, Day 8')
    }
  })

  test('grows and shrinks from the cell pressed by Shift with the arrows, and says the count', async () => {
    const element = (await strip(
      'rows="7" selection-mode="multiple" selection-shape="rectangle"',
      DAYS(21),
    )) as Selecting
    key(element, 'Home')
    key(element, 'ArrowDown')
    key(element, ' ')
    key(element, 'ArrowRight', true)
    key(element, 'ArrowDown', true)
    await element.updateComplete
    expect(element.value).toBe('Day 2, Day 3, Day 9, Day 10')
    expect(selected(element)).toEqual([1, 2, 8, 9])
    key(element, 'ArrowUp', true)
    await element.updateComplete
    await frame()
    await element.updateComplete
    expect(element.value).toBe('Day 2, Day 9')
    expect(selected(element)).toEqual([1, 8])
    expect(part(element, 'selection')?.textContent).toBe('2 selected')
  })

  test('starts from the cell the keys left where nothing was pressed', async () => {
    const element = (await strip(
      'rows="7" selection-mode="multiple" selection-shape="rectangle"',
      DAYS(21),
    )) as Selecting
    key(element, 'Home')
    await element.updateComplete
    key(element, 'ArrowRight', true)
    await element.updateComplete
    expect(element.value).toBe('Day 1, Day 8')
  })

  test('takes the rectangle to a cell clicked with Shift, and a cell clicked with Ctrl starts another', async () => {
    const element = (await strip(
      'rows="7" selection-mode="multiple" selection-shape="rectangle"',
      DAYS(21),
    )) as Selecting
    click(element, 1)
    click(element, 16, { shiftKey: true })
    await element.updateComplete
    expect(selected(element)).toEqual([1, 2, 8, 9, 15, 16])
    click(element, 20, { ctrlKey: true })
    click(element, 13, { shiftKey: true })
    await element.updateComplete
    // The first rectangle stays, and the value is in the table's order.
    expect(element.value).toBe('Day 2, Day 3, Day 9, Day 10, Day 14, Day 16, Day 17, Day 21')
    click(element, 9, { metaKey: true })
    await element.updateComplete
    expect(selected(element)).toEqual([1, 2, 8, 13, 15, 16, 20])
  })

  test('skips the places a short last column has no day for', async () => {
    const element = (await strip(
      'rows="7" selection-mode="multiple" selection-shape="rectangle"',
      DAYS(10),
    )) as Selecting
    click(element, 8)
    click(element, 4, { shiftKey: true })
    await element.updateComplete
    expect(element.value).toBe('Day 2, Day 3, Day 4, Day 5, Day 9, Day 10')
  })

  test('grows the way the arrow points on a right-to-left page', async () => {
    const host = (await mount(
      `<div dir="rtl">${table(DAYS(21))}<helix-headless-heatmap for="uptime" rows="7" selection-mode="multiple" selection-shape="rectangle"></helix-headless-heatmap></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-heatmap') as Selecting
    await element.updateComplete
    key(element, 'Home')
    key(element, ' ')
    key(element, 'ArrowLeft', true)
    key(element, 'ArrowDown', true)
    await element.updateComplete
    expect(element.value).toBe('Day 1, Day 2, Day 8, Day 9')
  })

  /* The anchor was the cell's place among those drawn, so a resize that
     added a column moved it onto another day, and the next range started
     there. It is the row of the table now. */
  describe('from the same day after a resize', () => {
    const resized = async (attributes: string): Promise<Selecting> => {
      const element = (await strip(
        `rows="7" min-cell="10" gap="0" selection-mode="multiple" ${attributes}`,
        DAYS(35),
      )) as Selecting
      ;(element as unknown as { width: number }).width = 30
      await element.updateComplete
      expect(cells(element)).toHaveLength(21)
      return element
    }
    const widen = async (element: Selecting): Promise<void> => {
      ;(element as unknown as { width: number }).width = 1000
      await element.updateComplete
      expect(cells(element)).toHaveLength(35)
    }

    test('a rectangle', async () => {
      const element = await resized('selection-shape="rectangle"')
      // Day 16, the second day of the first column drawn.
      click(element, 1)
      await widen(element)
      click(element, 29, { shiftKey: true })
      await element.updateComplete
      expect(element.value).toBe('Day 16, Day 23, Day 30')
    })

    test('a run of days', async () => {
      const element = await resized('')
      // Day 16, the second day of the first column drawn.
      key(element, 'Home')
      key(element, 'ArrowDown')
      key(element, ' ')
      await widen(element)
      key(element, 'Home')
      key(element, 'ArrowDown', true)
      await element.updateComplete
      const run = Array.from({ length: 14 }, (_, day) => `Day ${day + 2}`)
      expect(element.value).toBe(['Day 16', ...run].join(', '))
    })

    test('a rectangle whose first corner is no longer drawn', async () => {
      const element = (await strip(
        'rows="7" min-cell="10" gap="0" selection-mode="multiple" selection-shape="rectangle"',
        DAYS(35),
      )) as Selecting
      // Day 9, in the second column.
      click(element, 8)
      ;(element as unknown as { width: number }).width = 30
      await element.updateComplete
      // Day 30, drawn now in the third column of three.
      click(element, 15, { shiftKey: true })
      await element.updateComplete
      expect(element.value).toBe('Day 9, Day 16, Day 23, Day 30')
    })
  })

  test('is a single cell at a time under `single`', async () => {
    const element = (await strip(
      'rows="7" selection-mode="single" selection-shape="rectangle"',
      DAYS(21),
    )) as Selecting
    click(element, 1)
    click(element, 16, { shiftKey: true })
    await element.updateComplete
    expect(element.value).toBe('Day 17')
  })
})
