import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   Reading the table, the palette index and the list role are the base tier's
   and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-legend') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const TRAFFIC = `<table id="traffic">
  <thead><tr><th>Week</th><th>Direct</th><th>Search</th><th>Referral</th></tr></thead>
  <tbody>
    <tr><th scope="row">W1</th><td>120</td><td>80</td><td>20</td></tr>
    <tr><th scope="row">W2</th><td>140</td><td>96</td><td>24</td></tr>
  </tbody>
</table>`

type Legend = Updatable & {
  emphasis?: string
  glass?: string
  material?: string
  outlined?: string
  placement?: string
  subtle?: string
}

const legend = async (attributes = ''): Promise<Legend> => {
  await mount(`<div>${TRAFFIC}<helix-legend for="traffic" ${attributes}></helix-legend></div>`)
  const host = document.querySelector('helix-legend') as Legend
  await host.updateComplete
  return host
}

const entries = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part~="entry"]') ?? []),
]

describe('legend', () => {
  test('one entry per series, each a name with a mark drawn on the entry', async () => {
    const host = await legend()
    expect(entries(host)).toHaveLength(3)
    for (const entry of entries(host)) {
      expect(entry.querySelector('[part="name"]')).not.toBeNull()
      /* The mark is the entry's `::before` rather than a box in it: the entry
         already carries its series, so there was nothing for a box to hold. */
      expect(entry.querySelector('[part="swatch"]')).toBeNull()
    }
    expect(rule('[part~="entry"]::before')).toContain('content: ""')
  })

  test('emphasis, material and placement reflect, and rest on nothing', async () => {
    const host = await legend()
    for (const name of ['emphasis', 'material', 'placement']) {
      expect(host.hasAttribute(name)).toBe(false)
    }
    host.emphasis = 'outlined'
    host.material = 'glass'
    host.placement = 'end'
    await host.updateComplete
    expect(host.getAttribute('emphasis')).toBe('outlined')
    expect(host.getAttribute('material')).toBe('glass')
    expect(host.getAttribute('placement')).toBe('end')
  })

  test('a named series takes its own treatment, and the rest keep the legend’s', async () => {
    /* A per-series answer cannot be a selector, since CSS cannot match an
       attribute against a list, so the entries are marked after the update
       from the names the base tier chose to show. The same spelling as the
       chart's, so a chart and its key say the same thing the same way. */
    const host = await legend('glass="Referral" outlined="Search" subtle="Direct"')
    const marks = entries(host).map((entry) => entry.getAttribute('data-emphasis'))
    expect(marks).toEqual(['subtle', 'outlined', null])
    const materials = entries(host).map((entry) => entry.getAttribute('data-material'))
    expect(materials).toEqual([null, null, 'glass'])
  })

  test('the marks follow the properties: a name withdrawn is a mark removed, and case does not matter', async () => {
    const host = await legend('outlined="search"')
    expect(at(entries(host), 1).getAttribute('data-emphasis')).toBe('outlined')
    host.outlined = ''
    await host.updateComplete
    expect(at(entries(host), 1).hasAttribute('data-emphasis')).toBe(false)
  })

  test('the swatch is drawn from the palette this sheet carries', async () => {
    // The base tier writes the index; the mapping from index to token is the
    // styled tier's, so the two names have to meet here.
    const host = await legend()
    expect(at(entries(host), 0).getAttribute('style')).toContain(
      '--chart-series: var(--chart-series-1)',
    )
    expect(sheet()).toContain('--chart-series-1: var(--helix-color-series-1)')
    expect(sheet()).toContain('var(--chart-series)')
  })

  test('beside a chart the entries stack, and on the end side they read from the swatch inward', () => {
    expect(rule(':host([placement="end"]) [part="list"]')).toContain('flex-direction: column')
    expect(rule(':host([placement="end"]) [part~="entry"]')).toContain(
      'flex-direction: row-reverse',
    )
  })

  test('outlined keeps the fill under the edge, and the hooks the docs name are what the sheet reads', () => {
    // What `outlined` means on a mark whose area encodes a value, rather than
    // on a control whose fill is the loud part.
    const outlined = rule(
      ':host([emphasis="outlined"]) [part~="entry"]:not([data-emphasis])::before',
    )
    expect(outlined).toContain('background-color: color-mix(')
    expect(outlined).toMatch(
      /border: var\(--legend-swatch-stroke, var\(--helix-border-thick\)\) solid/,
    )
    for (const hook of ['--legend-direction', '--legend-gap', '--legend-swatch-size']) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

/* Every visual decision is a hook named after the family, defaulting to what
   was drawn before the hook existed. */
describe("the legend's hooks", () => {
  test('are read by the sheet, each with the old value as its fallback', () => {
    const declared = (customElements.get('helix-legend') as unknown as { styles: unknown }).styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const sheet = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return sheet.cssText ?? Array.from(sheet.cssRules ?? [], (rule) => rule.cssText).join('\n')
      })
      .join('\n')
      /* A formatter breaks a long fallback after `var(`. */
      .replace(/\(\s+/g, '(')
    for (const hook of ['--legend-color', '--legend-font-size']) {
      expect(text).toContain(`var(${hook},`)
    }
  })
})
