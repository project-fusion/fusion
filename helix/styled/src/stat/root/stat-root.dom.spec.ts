import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, slotted, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the two elements adopt, as text. happy-dom resolves no
   cascade, so what can be held here is that a rule exists rather than that it
   applied. The three slots, `direction` and the group's role are the base
   tier's and are tested there. */
const sheet = (tag: 'helix-stat' | 'helix-stat-group'): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`, in either sheet. */
const rule = (tag: 'helix-stat' | 'helix-stat-group', selector: string): string =>
  sheet(tag).split(`${selector} {`)[1]?.split('}')[0] ?? ''

const figure = `<helix-stat>
  98.2
  <span slot="label">Uptime</span>
  <span slot="unit">%</span>
</helix-stat>`

describe('stat', () => {
  test('the pair is a grid: the label across the top, the unit on the number’s baseline', async () => {
    // Measured at 14px: without both saying so, the unit's bottom sat 32.5px
    // above the number's.
    const stat = await mount(figure)
    expect(slotted(stat, 'unit')).toHaveLength(1)
    expect(rule('helix-stat', ':host')).toContain('display: grid')
    expect(rule('helix-stat', ':host')).toContain('align-items: baseline')
    expect(rule('helix-stat', 'slot[name="label"]::slotted(*)')).toContain('grid-column: 1 / -1')
  })

  test('the figure is on the display face at a size that scales with its surroundings', () => {
    /* A ratio off the ramp rather than a rung, because a figure in a donut's
       hole has to grow with the ring, and a 44px number does not. */
    const value = rule('helix-stat', 'slot:not([name])')
    expect(value).toContain('font-family: var(--helix-font-display)')
    expect(value).toContain(
      'font-size: var(--stat-value-size, calc(var(--helix-text-3xl) / var(--helix-text-md) * 1em))',
    )
    expect(rule('helix-stat', 'slot[name="unit"]::slotted(*)')).toContain(
      'var(--helix-color-foreground-muted)',
    )
  })

  test('the directions are rules keyed on the attribute the base tier reflects', () => {
    // The markup order never changes with the visual one, so a screen reader
    // hears the label first whichever way the pair is drawn.
    expect(
      rule('helix-stat', ':host([direction="column-reverse"]) slot[name="label"]::slotted(*)'),
    ).toContain('order: 1')
    expect(rule('helix-stat', ':host([direction="row-reverse"])')).toContain('display: flex')
    expect(rule('helix-stat', ':host([direction="row-reverse"]) slot[name="label"]')).toContain(
      'order: 1',
    )
  })

  test('a group wraps, and divides on the figure rather than between slots', async () => {
    /* A `<slot>` is `display: contents` and generates no box to put a border
       on, so the rule lands on every slotted figure, and the group clips the
       one pulled out past the start of each row rather than skipping the first
       figure, which leaves a rule at the start of a row that wrapped. */
    const group = (await mount(
      `<helix-stat-group>${figure}${figure}</helix-stat-group>`,
    )) as Updatable & { divided: boolean }
    expect(group.hasAttribute('divided')).toBe(false)
    group.divided = true
    await group.updateComplete
    expect(group.hasAttribute('divided')).toBe(true)
    expect(rule('helix-stat-group', ':host')).toContain('flex-wrap: wrap')
    expect(rule('helix-stat-group', ':host([divided])')).toContain('overflow-x: clip')
    const divided = rule('helix-stat-group', ':host([divided]) ::slotted(*)')
    expect(divided).toContain('border-inline-start: var(--helix-border-thin) solid')
    expect(divided).toContain('margin-inline-start: calc(var(--_stat-group-gap) * -1')
    expect(divided).toContain('padding-inline-start: var(--_stat-group-gap)')
  })

  test('the hooks the docs name are what the sheets read', () => {
    expect(sheet('helix-stat')).toMatch(/var\(\s*--stat-value-size,/)
    expect(sheet('helix-stat-group')).toMatch(/var\(\s*--stat-group-gap,/)
  })
})

describe('stat hooks', () => {
  test('every visual decision has a hook that falls back to the value it replaced', () => {
    expect(rule('helix-stat', ':host')).toContain('gap: var(--stat-gap, var(--helix-space-2xs))')
    const label = rule('helix-stat', 'slot[name="label"]::slotted(*)')
    expect(label).toContain('color: var(--stat-label-color, var(--helix-color-foreground-muted))')
    expect(label).toContain('font-size: var(--stat-label-size, calc(')
    const unit = rule('helix-stat', 'slot[name="unit"]::slotted(*)')
    expect(unit).toContain('color: var(--stat-unit-color, var(--helix-color-foreground-muted))')
    expect(unit).toContain('font-size: var(--stat-unit-size, calc(')
    expect(rule('helix-stat', 'slot:not([name])')).toContain(
      'color: var(--stat-value-color, var(--helix-color-foreground))',
    )
  })
})
