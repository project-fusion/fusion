import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Forced colors paint every background the page's Canvas color. A mark drawn
 * as a background, a heatmap cell, a scatter point, a meter's fill, a star, a
 * badge's dot, a legend's swatch, disappeared on a blank page while SVG marks
 * beside it kept their colors. Each family below says, in its own sheet, how
 * its marks survive.
 *
 * happy-dom resolves no cascade, so what is held here is that each rule is
 * written; the audit in Chromium under `emulateMedia({ forcedColors:
 * 'active' })` is what showed each mark gone before and back after. */

beforeAll(async () => {
  registerDom()
  await Promise.all(
    [
      'heatmap',
      'scatter-chart',
      'line-chart',
      'sparkline',
      'meter',
      'rating',
      'skeleton',
      'badge',
      'legend',
      'graph',
      'map',
      'checkbox',
      'radio',
      'toggle',
      'pagination',
      'option',
    ].map((family) => import(`../${family}/index.js`)),
  )
})

/** The rules a family's sheets write under forced colors, as text. */
const forced = (tag: string): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
    .split('@media (forced-colors: active)')
    .slice(1)
    .map(block)
    .join('\n')
}

/** What a block holds, from its opening brace to the brace that closes it. */
const block = (text: string): string => {
  let depth = 0
  for (let at = 0; at < text.length; at++) {
    depth += text[at] === '{' ? 1 : text[at] === '}' ? -1 : 0
    if (depth === 0 && text[at] === '}') {
      return text.slice(0, at + 1)
    }
  }
  return text
}

/** The declarations of the first forced rule written for `selector`. */
const rule = (tag: string, selector: string): string =>
  forced(tag).split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('under forced colors', () => {
  test('a heatmap cell keeps its tone, bounded in the text color', () => {
    const cell = rule('helix-heatmap', '[part~="cell"]')
    expect(cell).toContain('forced-color-adjust: none')
    expect(cell).toContain('CanvasText')
    expect(rule('helix-heatmap', '[part~="cell-active"]')).toContain('Highlight')
    expect(rule('helix-heatmap', '[part~="cell-selected"]')).toContain('Highlight')
  })

  test('a scatter point keeps its series color, ringed in the text color', () => {
    expect(rule('helix-scatter-chart', '[part="point"]')).toContain('forced-color-adjust: none')
    expect(rule('helix-scatter-chart', '[part="point-ring"]')).toContain('CanvasText')
    const active = rule('helix-scatter-chart', '[part="point-active"]')
    expect(active).toContain('forced-color-adjust: none')
    expect(active).toContain('Highlight')
  })

  test('the end of a line and its markers keep the line’s color', () => {
    expect(rule('helix-line-chart', '[part="terminus"]')).toContain('forced-color-adjust: none')
    expect(rule('helix-line-chart', '[part~="marker"]')).toContain('forced-color-adjust: none')
    expect(rule('helix-sparkline', '[part="terminus"]')).toContain('forced-color-adjust: none')
    expect(forced('helix-sparkline')).toMatch(/\[part="low"\] \{\s*forced-color-adjust: none/u)
  })

  test('a meter is outlined, filled in Highlight, and a band keeps its color', () => {
    expect(rule('helix-meter', '[part="track"]')).toContain('CanvasText')
    const fill = rule('helix-meter', '[part~="indicator"]')
    expect(fill).toContain('background-color: Highlight')
    expect(fill).toContain('forced-color-adjust: none')
    expect(rule('helix-meter', '[part~="indicator"][data-band]')).toContain('var(--_meter-hue)')
  })

  test('a rating’s marks are Highlight where filled and GrayText where not', () => {
    const sheet = forced('helix-rating')
    expect(sheet).toMatch(/\[part="fill"\] \{\s*forced-color-adjust: none/u)
    expect(sheet).toMatch(/\[part="track"\] \{\s*color: GrayText/u)
    expect(sheet).toMatch(/\[part="fill"\] \{\s*color: Highlight/u)
  })

  test('a chosen control draws its mark in Highlight', () => {
    expect(rule('helix-checkbox', '[part~="mark"]')).toContain('Highlight')
    expect(rule('helix-radio', '[part="box"]::after')).toContain('Highlight')
    expect(forced('helix-toggle-group')).toContain('Highlight')
    expect(forced('helix-pagination')).toContain('HighlightText')
    expect(forced('helix-option')).toContain('Highlight')
  })

  test('a skeleton is outlined in GrayText', () => {
    expect(rule('helix-skeleton', '[part~="skeleton"]')).toContain('GrayText')
  })

  /* Measured in Chromium under `emulateMedia({ forcedColors: 'active' })`:
     the sheen's gradient computed to `none` before. After, it is a GrayText
     band whose darkest column moved from x 2 to 33, 112, 239 and 365 in frames
     400 ms apart on a 368 px skeleton, and with motion reduced as well the
     background is `none` and nothing moves. */
  test('a skeleton sweeps a GrayText band, only while motion is allowed', () => {
    const sheen = rule('helix-skeleton', '[part="sheen"]')
    expect(sheen).toContain('GrayText')
    expect(sheen).toContain('forced-color-adjust: none')
    const moving = forced('helix-skeleton').split('and (prefers-reduced-motion: no-preference)')
    expect(moving).toHaveLength(2)
    expect(moving[1]).toContain('[part="sheen"]')
    expect(moving[0]).not.toContain('[part="sheen"]')
  })

  test('a badge keeps its fill and its tone, bounded in the text color', () => {
    const mark = rule('helix-badge', '[part="indicator"]')
    expect(mark).toContain('forced-color-adjust: none')
    expect(mark).toContain('CanvasText')
  })

  test('a legend’s swatch and a graph’s keep the colors they key', () => {
    expect(rule('helix-legend', '[part~="entry"]::before')).toContain('forced-color-adjust: none')
    expect(rule('helix-graph', '[part="legend-swatch"]')).toContain('forced-color-adjust: none')
    expect(forced('helix-graph')).toMatch(
      /\[part="search"\]:has\(\[aria-activedescendant\]\) ~ \[part="list"\] \[part~="note-cursor"\] \{\s*outline:/u,
    )
  })

  test('a place on a map keeps the colors it was given for the map under it', () => {
    expect(rule('helix-map-marker', '[part="point"]')).toContain('forced-color-adjust: none')
    expect(forced('helix-map-position')).toContain('forced-color-adjust: none')
  })
})
