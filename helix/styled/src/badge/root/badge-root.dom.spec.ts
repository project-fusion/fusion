import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied;
   the browser lane is where the picture is seen to. The counting, the cap and
   the announcement are the base tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-badge') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const TONES = ['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']

describe('badge', () => {
  test('draws the mark the base tier renders, under its own tag', async () => {
    const badge = await mount('<helix-badge value="3"><span>x</span></helix-badge>')
    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('3')
  })

  test('tone reflects, since the fill is a rule keyed on it, and rests on nothing', async () => {
    /* Absent rather than `primary`: a reflected default writes an attribute the
       consumer's markup never had, which React reports on hydration. */
    const badge = (await mount(
      '<helix-badge value="3"><span>x</span></helix-badge>',
    )) as Updatable & { tone?: string }
    expect(badge.hasAttribute('tone')).toBe(false)
    badge.tone = 'danger'
    await badge.updateComplete
    expect(badge.getAttribute('tone')).toBe('danger')
  })

  test('every tone the property names has a fill, primary included', () => {
    /* A tone with no rule falls to the resting fill in silence, so a page
       marking a build green would show the brand color and nothing would say
       so. `primary` is the resting fill and still sayable, so a generated page
       can state what it means rather than leave the attribute off. */
    const missing = TONES.filter(
      (tone) => !sheet().includes(`:host([tone="${tone}"]) [part="indicator"]`),
    )
    expect(missing).toEqual([])
  })

  test('each family of fill carries its own label, and neutral sets its own ink', () => {
    /* The primary's label is on the base rule, and the accent and the four
       statuses each name theirs: an ink fill is light in the dark, so one label
       could not stand on it and on a danger fill. Neutral is a rung on the
       surface ladder, so the page's own foreground is said, or white lands on
       gray. */
    expect(rule(':host')).toContain('--_badge-on: var(--helix-color-foreground-on-primary)')
    expect(rule('[part="indicator"]')).toContain('color: var(--_badge-on)')
    expect(sheet()).toMatch(
      /:host\(\[tone="accent"\]\) \{\s*--_badge-on: var\(--helix-color-foreground-on-accent\)/,
    )
    expect(sheet()).toMatch(
      /:host\(\[tone="warning"\]\) \{\s*--_badge-on: var\(--helix-color-foreground-on-status\)/,
    )
    expect(rule(':host([tone="neutral"]) [part="indicator"]')).toContain(
      'color: var(--helix-color-foreground)',
    )
    expect(rule(':host([tone="success"]) [part="indicator"]')).not.toMatch(/\ncolor:/)
  })

  test('the ring is a rule in the page color, so the mark stays separate from what it overlaps', () => {
    expect(rule('[part="indicator"]')).toContain(
      'box-shadow: 0 0 0 var(--helix-border-thick) var(--badge-ring-color, var(--helix-color-background))',
    )
    // An annotation is not a target: the press belongs to what it is pinned to.
    expect(rule('[part="indicator"]')).toContain('pointer-events: none')
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--badge-background-color', '--badge-offset', '--badge-ring-color']) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})
