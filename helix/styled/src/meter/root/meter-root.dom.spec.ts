import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The reading, the range, the bands and the meter role are the base tier's and
   are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-meter') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const meter = async (attributes = ''): Promise<Updatable & { emphasis?: string }> =>
  (await mount(`<helix-meter label="Disk" ${attributes}></helix-meter>`)) as Updatable & {
    emphasis?: string
  }

describe('meter', () => {
  test('emphasis reflects, and rests on nothing', async () => {
    const host = await meter('value="42"')
    expect(host.hasAttribute('emphasis')).toBe(false)
    host.emphasis = 'subtle'
    await host.updateComplete
    expect(host.getAttribute('emphasis')).toBe('subtle')
  })

  test('the fill is a scale read off the name the base tier writes', async () => {
    /* A transform rather than a width, because it is composited and a meter fed
       by live data updates often. The seam is the name: the tier below writes
       it and this sheet reads it, and neither can see the other. */
    const host = await meter('value="25"')
    expect(part(host, 'indicator')?.getAttribute('style')).toContain('--meter-fraction: 0.25')
    expect(sheet()).toContain('scale: var(--meter-fraction, 0) 1')
  })

  test('the three bands recolor the fill, in bar and ring alike', () => {
    // Color is the obvious half and the ticks are the other: a reading that
    // only says "poor" in red says nothing to a reader who cannot see red.
    const tokens = { fair: 'warning', good: 'success', poor: 'danger' }
    for (const [band, token] of Object.entries(tokens)) {
      expect(rule(`[part~="indicator"][data-band="${band}"]`)).toContain(
        `--_meter-hue: var(--meter-color, var(--helix-color-${token}))`,
      )
      /* `--meter-color` overrides a band on the round shapes as it does on the
         bar, which it did not: a ring and an arc kept the band's own tone. */
      expect(rule(`:host([shape="ring"]) [part~="indicator"][data-band="${band}"]`)).toContain(
        `--_meter-hue: var(--meter-color, var(--helix-color-${token}))`,
      )
    }
    expect(rule(':host([shape="ring"]) [part~="indicator"]')).toContain(
      '--_meter-hue: var(--meter-color, var(--helix-color-foreground-muted))',
    )
    expect(rule('[part="tick"]')).toContain('inset-inline-start: var(--meter-at, 0%)')
  })

  test('a reading past either end squares the corner it ran out at', () => {
    expect(rule('[part~="indicator"][data-beyond="over"]')).toContain(
      'border-end-end-radius: var(--helix-radii-none)',
    )
    expect(rule('[part~="indicator"][data-beyond="under"]')).toContain(
      'border-start-start-radius: var(--helix-radii-none)',
    )
  })

  test("the round shapes undo the bar's scale, or they draw one pixel wide", () => {
    /* `--meter-fraction` is never written in these shapes, so the bar's
       fallback wins and the circle is scaled to zero width: present, correctly
       stroked, and invisible. */
    const round = rule(':host([shape="ring"]) [part~="indicator"]')
    expect(round).toContain('scale: none')
    expect(round).toContain('stroke-dasharray: var(--meter-along) 100')
    // Twelve o'clock for a ring, where an SVG circle starts at three; an arc
    // starts at one end of its own opening, so the gap is where the reading goes.
    expect(sheet()).toContain(':host([shape="ring"]) [part="track"] {rotate: -90deg')
    expect(sheet()).toContain(':host([shape="arc"]) [part="track"] {rotate: 135deg')
  })

  test('subtle is a wash of whichever color the band chose', () => {
    // Written against the one variable, so a single rule quiets all four
    // colors, and the bands keep saying what they mean.
    expect(rule(':host([emphasis="subtle"]) [part~="indicator"]')).toContain(
      'var(--_meter-hue) 30%',
    )
    expect(rule(':host([emphasis="subtle"][shape="ring"]) [part~="indicator"]')).toContain(
      'var(--_meter-hue) 30%',
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of [
      '--meter-color',
      '--meter-ring-size',
      '--meter-ring-width',
      '--meter-size',
      '--meter-tick-color',
      '--meter-track-color',
    ]) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

describe('a slotted label', () => {
  test('sits above the meter across the whole row, with hooks that fall back to today', () => {
    const label = rule('slot[name="label"]::slotted(*)')
    expect(label).toContain('grid-column: 1 / -1')
    expect(label).toContain('display: block')
    expect(label).toContain('color: var(--meter-label-color, var(--helix-color-foreground))')
    expect(label).toContain('font-size: var(--meter-label-size, var(--helix-text-sm))')
    expect(label).toContain('margin-block-end: var(--meter-label-gap, var(--helix-space-2xs))')
  })
})

/* Every visual decision is a hook named after the family, defaulting to what
   was drawn before the hook existed. */
describe("the meter's hooks", () => {
  test('are read by the sheet, each with the old value as its fallback', () => {
    const declared = (customElements.get('helix-meter') as unknown as { styles: unknown }).styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const sheet = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return sheet.cssText ?? Array.from(sheet.cssRules ?? [], (rule) => rule.cssText).join('\n')
      })
      .join('\n')
      /* A formatter breaks a long fallback after `var(`. */
      .replace(/\(\s+/g, '(')
    for (const hook of ['--meter-value-color', '--meter-value-gap', '--meter-value-size']) {
      expect(text).toContain(`var(${hook},`)
    }
  })
})
