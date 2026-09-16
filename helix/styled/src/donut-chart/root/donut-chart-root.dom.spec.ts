import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The shares, the arcs and the table watcher are the base tier's and are
   tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-donut-chart') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const TRAFFIC = `<table id="traffic">
  <caption>Sessions by source</caption>
  <thead><tr><th scope="col">Source</th><th scope="col">Share</th></tr></thead>
  <tbody>
    <tr><th scope="row">Direct</th><td data-value="50">50</td></tr>
    <tr><th scope="row">Search</th><td data-value="30">30</td></tr>
    <tr><th scope="row">Social</th><td data-value="20">20</td></tr>
  </tbody>
</table>`

type Chart = Updatable & { emphasis?: string; material?: string }

const chart = async (attributes = ''): Promise<Chart> => {
  await mount(
    `<div>${TRAFFIC}<helix-donut-chart for="traffic" ${attributes}></helix-donut-chart></div>`,
  )
  const host = document.querySelector('helix-donut-chart') as Chart
  await host.updateComplete
  return host
}

describe('donut chart', () => {
  test('draws the track under one slice per row, in its own shadow root', async () => {
    const host = await chart()
    expect(part(host, 'track')).not.toBeNull()
    expect(host.shadowRoot?.querySelectorAll('[part~="segment"]')).toHaveLength(3)
  })

  test('the tooltip it renders is the styled one, since this is the styled tier', async () => {
    /* `tag()` builds a child's name from this prefix and the base declares
       `helix-headless-`. Left at that, the reading bubble was the browser's own
       popover defaults inside a styled chart. Importing this family is what
       registers the styled tooltip, so a consumer never has to. */
    await chart()
    const Element = customElements.get('helix-donut-chart') as unknown as { tier: string }
    expect(Element.tier).toBe('helix-')
    expect(customElements.get('helix-tooltip')).toBeDefined()
  })

  test('emphasis and material reflect, and rest on nothing', async () => {
    const host = await chart()
    expect(host.hasAttribute('emphasis')).toBe(false)
    expect(host.hasAttribute('material')).toBe(false)
    host.emphasis = 'subtle'
    host.material = 'glass'
    await host.updateComplete
    expect(host.getAttribute('emphasis')).toBe('subtle')
    expect(host.getAttribute('material')).toBe('glass')
  })

  test('the stroke width is written in the markup, and the sheet reads it rather than setting it', async () => {
    /* The stroke's width and the ring's radius have to agree, so only one of
       them can be a CSS hook. Set here and derived there, every ring came out
       twelve units thick whatever its `hole`. */
    const host = await chart('hole="large"')
    expect(part(host, 'plot')?.getAttribute('style')).toContain('--donut-chart-stroke: 8')
    expect(sheet()).toContain('stroke-width: var(--donut-chart-stroke)')
    expect(sheet()).not.toContain('--donut-chart-stroke:')
  })

  test('the edge paints nothing until outlined asks for it', () => {
    // The path is in the markup for every donut, geometry being structural,
    // and only this rule gives it ink.
    expect(rule('[part="segment-edge"]')).toContain('stroke: none')
    const outlined = rule(':host([emphasis="outlined"]) [part="segment-edge"]')
    expect(outlined).toContain('stroke: var(--chart-series)')
    expect(outlined).toContain('stroke-width: var(--donut-chart-edge-stroke, 3)')
  })

  test('subtle is a wash toward the track, and glass and frosted thin the slices in that order', () => {
    expect(rule(':host([emphasis="subtle"]) [part~="segment"]')).toContain(
      'var(--chart-series) 30%',
    )
    expect(rule(':host([material="glass"]) [part~="segment"]')).toContain(
      'stroke-opacity: calc(0.62 * var(--helix-material-opacity))',
    )
    expect(rule(':host([material="frosted"]) [part~="segment"]')).toContain(
      'stroke-opacity: calc(0.88 * var(--helix-material-opacity))',
    )
  })

  test('the middle is sized off the hole and not off the ring', async () => {
    /* The stroke sits astride `r`, so the inner edge comes in by the whole
       thickness and the hole's *diameter* is the ring's less two of them.
       Taking it off once laid a 64 unit box inside a 48 unit hole at rest, a
       third too wide, and a total slotted into it painted across four slices.
       The half ring is the check on it: at `80 - 2t` its opening is twice as
       wide as it is tall at every thickness, which is what its own comment
       claims, and at `80 - t` it was 2.67 to 1. */
    expect(rule('[part="center"]')).toContain(
      'calc(100% * (var(--_donut-chart-ring) - 2 * var(--donut-chart-stroke, 16)) / 100)',
    )
  })

  test('the series palette arrives with the sheet, and the hooks the docs name are read by it', async () => {
    const host = await chart()
    expect(part(host, 'segment')?.getAttribute('style')).toContain(
      '--chart-series: var(--chart-series-1)',
    )
    expect(sheet()).toContain('--chart-series-1: var(--helix-color-series-1)')
    for (const hook of [
      '--donut-chart-edge-stroke',
      '--donut-chart-size',
      '--donut-chart-track-color',
    ]) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

/* `sweep` shipped publicly in `arc.html` and was asserted on neither tier. The
   headless spec holds the drawing; these are the three things this tier has to
   say about it, and its docblock names all three as the reason it reflects. */
describe('donut chart sweep', () => {
  test('reflects, since the sheet has three things to say about it', async () => {
    const host = (await chart()) as Chart & { sweep?: string }
    expect(host.hasAttribute('sweep')).toBe(false)
    host.sweep = 'half'
    await host.updateComplete
    expect(host.getAttribute('sweep')).toBe('half')
  })

  test('the box stops being square, since the drawing is no longer round', () => {
    expect(rule(':host([sweep="half"]) [part="plot"] svg')).toContain(
      'aspect-ratio: 100 / calc(40 + var(--donut-chart-stroke, 16) / 2)',
    )
  })

  test("the first slice starts at nine o'clock, and the track turns with it", () => {
    /* One rule over both, so the arc and the ring it sits on cannot part. */
    expect(rule(':host([sweep="half"]) [part~="segment"]')).toContain('transform: rotate(180deg)')
    expect(sheet()).toContain(':host([sweep="half"]) [part="track"],')
  })

  test('the middle sits at the bottom, where the center of the circle now is', () => {
    /* Cropping put the circle's center on the box's bottom edge, so a middle at
       fifty per cent of the plot floats inside the arc and over its top. */
    const half = rule(':host([sweep="half"]) [part="center"]')
    expect(half).toContain('inset-block-end: 0')
    expect(half).toContain('inset-block-start: auto')
  })
})
