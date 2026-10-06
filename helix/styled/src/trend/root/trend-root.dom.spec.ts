import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The direction word, the judgment text and the reflecting pair are the base
   tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-trend') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule whose selector list names `selector`. */
const rule = (selector: string): string => {
  for (const block of sheet().split('}')) {
    const pieces = block.split('{')
    const head = pieces.at(-2) ?? ''
    if (head.split(',').some((one) => one.trim() === selector)) {
      return pieces.at(-1) ?? ''
    }
  }
  return ''
}

describe('trend', () => {
  test('draws the arrow through the shared glyph sheet, which arrives with this one', async () => {
    // The arrow is a named import rather than a `<helix-icon>`, so it is sized
    // by the `[data-glyph]` rule and that rule has to be adopted here.
    const trend = await mount('<helix-trend movement="up" good="up">12%</helix-trend>')
    expect(part(trend, 'icon')?.hasAttribute('data-glyph')).toBe(true)
    expect(rule('[data-glyph]')).toContain('block-size: var(--icon-size, var(--helix-size-icon))')
    expect(rule('[part="icon"]')).toContain('--icon-size: var(--trend-icon-size, 1em)')
  })

  test('gray until told what good means', () => {
    /* Not a fallback that never fires: it is the state of every trend whose
       consumer has not set `good`, and it is meant to be. */
    expect(sheet()).toContain(
      '--_trend-color: var(--trend-neutral-color, var(--helix-color-foreground-muted))',
    )
    expect(sheet()).toContain('color: var(--trend-color, var(--_trend-color))')
  })

  /* Four attribute pairs named `direction`, so a trend written with
     `movement` stayed gray. The base tier's states say the judgment whichever
     word moved it. */
  test("the judgment is read from the base tier's states", () => {
    expect(rule(':host(:state(better))')).toContain(
      '--_trend-color: var(--trend-better-color, var(--helix-color-success))',
    )
    expect(rule(':host(:state(worse))')).toContain(
      '--_trend-color: var(--trend-worse-color, var(--helix-color-danger))',
    )
    expect(sheet()).not.toContain('[direction=')
  })

  /* A served page has this sheet before the script runs and no state yet, so
     a served trend that was good news drew gray and turned green on
     hydration. The attribute pairs stand in until the element is defined. */
  test('a served trend is judged by its attributes before the element upgrades', () => {
    const better = '--_trend-color: var(--trend-better-color, var(--helix-color-success))'
    const worse = '--_trend-color: var(--trend-worse-color, var(--helix-color-danger))'
    expect(rule(':host(:not(:defined)[good="up"][movement="up"])')).toContain(better)
    expect(rule(':host(:not(:defined)[good="down"][movement="down"])')).toContain(better)
    expect(rule(':host(:not(:defined)[good="up"][movement="down"])')).toContain(worse)
    expect(rule(':host(:not(:defined)[good="down"][movement="up"])')).toContain(worse)
    for (const selector of sheet().match(/:host\([^{,]*\[good=[^{,]*\)/g) ?? []) {
      expect(selector).toContain(':not(:defined)')
    }
  })

  test('the direction word is out of sight and still in the tree', () => {
    // The clip rather than `display: none`, which would leave the direction
    // carried by a colored arrow alone.
    expect(rule('[part="direction"]')).toContain('clip-path: inset(50%)')
    expect(rule('[part="direction"]')).not.toContain('display: none')
  })

  test('the label is quieter than the metric, and quiet enough to still be read', () => {
    // Muted rather than subtle: subtle is 3.78:1 on the light surface, under
    // the 4.5:1 this text needs.
    expect(rule('slot[name="label"]')).toContain(
      'color: var(--trend-label-color, var(--helix-color-foreground-muted))',
    )
    expect(rule('slot[name="label"]')).toContain('font-weight: var(--helix-weight-regular)')
  })
})

describe('trend hooks', () => {
  test('each judgment has a hook that falls back to its status color', () => {
    expect(rule(':host(:state(better))')).toContain(
      '--_trend-color: var(--trend-better-color, var(--helix-color-success))',
    )
    expect(sheet()).toContain('--_trend-color: var(--trend-worse-color, var(--helix-color-danger))')
    expect(sheet()).toContain(
      '--_trend-color: var(--trend-neutral-color, var(--helix-color-foreground-muted))',
    )
  })

  test('the gap, the label and a slotted glyph each take a hook', () => {
    expect(sheet()).toContain('gap: var(--trend-gap, var(--helix-space-2xs))')
    expect(rule('slot[name="label"]')).toContain(
      'color: var(--trend-label-color, var(--helix-color-foreground-muted))',
    )
    expect(rule('slot[name$="icon"]::slotted(*)')).toContain(
      'block-size: var(--trend-icon-size, 1em)',
    )
  })
})
