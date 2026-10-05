import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Progress = HTMLElement & {
  fraction: number
  internals?: ElementInternals
  max: number
  updateComplete: Promise<boolean>
  value: number
  valueText: string
}

/* The browser harness implements a small `expect`, and the approximate matcher
   is not in it: written that way these pass under bun and fail in the one
   runner that can actually measure a box. A tolerance said out loud is clearer
   anyway, because what counts as close is a fact about the thing measured. */
const within = (actual: number, expected: number, tolerance: number): boolean =>
  Math.abs(actual - expected) <= tolerance

const progress = async (attrs = 'value="62"'): Promise<Progress> =>
  (await mount(
    `<helix-headless-progress label="Uploading" ${attrs}></helix-headless-progress>`,
  )) as Progress

describe('the value shown', () => {
  /* Written by concatenation it ignored the locale: no space before the sign
     in French, Latin digits in Arabic. */
  test('is written the way `locale` writes a percentage', async () => {
    const bar = await progress('locale="fr" show-value value="62"')
    const shown = bar.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim()
    expect(shown).toBe(new Intl.NumberFormat('fr', { style: 'percent' }).format(0.62))
  })
})

/* React Aria's ProgressBar takes Intl `formatOptions`; a percentage was the
   only thing this could write. */
describe('format-options', () => {
  test('writes the value in a unit, on the screen and when read out', async () => {
    const bar = await progress(
      `max="120" show-value value="45" locale="en" format-options='{"style":"unit","unit":"megabyte"}'`,
    )
    const words = new Intl.NumberFormat('en', { style: 'unit', unit: 'megabyte' }).format(45)
    expect(bar.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim()).toBe(words)
    expect(bar.internals?.ariaValueText).toBe(words)
  })

  test('writes a share of the range for a percent, and says nothing extra while indeterminate', async () => {
    const bar = await progress(
      `show-value value="12.5" locale="en" format-options='{"style":"percent","minimumFractionDigits":1}'`,
    )
    expect(bar.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim()).toBe('12.5%')
    const busy = await progress(`indeterminate format-options='{"style":"percent"}'`)
    expect(busy.internals?.ariaValueText).toBeNull()
  })

  test('absent writes a whole percentage and leaves the reading to the platform', async () => {
    const bar = await progress('show-value value="62" locale="en"')
    expect(bar.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim()).toBe('62%')
    expect(bar.internals?.ariaValueText).toBeNull()
  })
})

describe('progress', () => {
  test('announces itself as a progress bar with a name, through internals', async () => {
    const bar = await progress()
    expect(bar.hasAttribute('role')).toBe(false)
    expect(bar.internals?.role).toBe('progressbar')
    expect(bar.internals?.ariaLabel).toBe('Uploading')
  })

  test('the announced value and the drawn one are the same number', async () => {
    /* The two are computed from one clamp for exactly this reason. A bar
       reporting 140 to a screen reader while drawing a full track is telling
       two readers different things about the same state. */
    const bar = await progress('max="8" value="12"')
    expect(bar.fraction).toBe(1)
    expect(bar.internals?.ariaValueNow).toBe('8')
    expect(bar.internals?.ariaValueMax).toBe('8')
  })

  test('a negative value is nothing done rather than a reversed bar', async () => {
    const bar = await progress('value="-5"')
    expect(bar.fraction).toBe(0)
    expect(bar.internals?.ariaValueNow).toBe('0')
  })

  test('a max of zero falls back to the default, and says so as well as draws it', async () => {
    /* Dividing by it gives `Infinity`, or `NaN` when the value is zero too, and
       either reaches CSS as an invalid `scale` and stops the bar drawing at all
       rather than drawing something wrong. So an unusable `max` becomes the
       default one.

       The half that matters is the second assertion. Falling back is a
       reinterpretation of what the consumer wrote whatever it does, and the
       only thing that makes it safe is that the announcement is reinterpreted
       the same way: a bar drawn against 100 while reporting a maximum of 0 is
       two readers being told different things. */
    const bar = await progress('max="0" value="5"')
    expect(within(bar.fraction, 0.05, 0.0001)).toBe(true)
    expect(bar.internals?.ariaValueMax).toBe('100')
    expect(bar.internals?.ariaValueNow).toBe('5')
  })

  /* A range had to start at zero, which a measure such as a version number
     does not: React Aria's progress bar takes a `minValue` for it. */
  test('a range can start above zero, and the bar and the announcement measure from it', async () => {
    const bar = await progress('min="12" max="20" value="16"')
    expect(bar.fraction).toBe(0.5)
    expect(bar.internals?.ariaValueMin).toBe('12')
    expect(bar.internals?.ariaValueMax).toBe('20')
    expect(bar.internals?.ariaValueNow).toBe('16')
    const under = await progress('min="12" max="20" value="4"')
    expect([under.fraction, under.internals?.ariaValueNow]).toEqual([0, '12'])
  })

  test('value text is announced beside the number, never instead of it', async () => {
    const bar = await progress('max="8" value="3" value-text="3 of 8 records"')
    expect(bar.internals?.ariaValueText).toBe('3 of 8 records')
    expect(bar.internals?.ariaValueNow).toBe('3')
  })

  test('no value text means none is announced, rather than an empty one', async () => {
    expect((await progress()).internals?.ariaValueText).toBeNull()
  })
  test('reports no value at all, which is how the platform says unknown', async () => {
    /* Absent, not zero. An omitted `aria-valuenow` is the platform's own
         signal for indeterminate and the only one. Reporting 0 would announce
         "0 percent" for work that is running, which is wrong rather than
         merely unknown. */
    const bar = await progress('indeterminate')
    expect(bar.internals?.ariaValueNow ?? null).toBeNull()
    expect(bar.internals?.role).toBe('progressbar')
    expect(bar.internals?.ariaValueMax).toBe('100')
  })

  test('a value is ignored while it is set, rather than half-honored', async () => {
    const bar = await progress('indeterminate value="40"')
    expect(bar.internals?.ariaValueNow ?? null).toBeNull()
  })

  test('going determinate restores the number', async () => {
    const bar = await progress('indeterminate value="40"')
    ;(bar as unknown as { indeterminate: boolean }).indeterminate = false
    await bar.updateComplete
    expect(bar.internals?.ariaValueNow).toBe('40')
  })
})

/* RAC's visible Label and Web Awesome's label slot: words on the page that also
   name the reading, so the two cannot disagree. */
describe('a visible label', () => {
  type Host = HTMLElement & { internals: ElementInternals; updateComplete: Promise<boolean> }

  test('names the progress with the words it shows, in place of `label`', async () => {
    const host = (await mount(
      '<helix-headless-progress label="Fallback" value="40"><span slot="label">Disk  used</span></helix-headless-progress>',
    )) as Host
    expect(host.internals.ariaLabel).toBe('Disk used')
  })

  test('arriving later renames it, and leaving gives `label` back', async () => {
    const host = (await mount(
      '<helix-headless-progress label="Fallback" value="40"></helix-headless-progress>',
    )) as Host
    expect(host.internals.ariaLabel).toBe('Fallback')
    const words = document.createElement('span')
    words.slot = 'label'
    words.textContent = 'Memory'
    host.append(words)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
    expect(host.internals.ariaLabel).toBe('Memory')
    words.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
    expect(host.internals.ariaLabel).toBe('Fallback')
  })

  test('is a bare slot, so without one nothing new is drawn', async () => {
    const host = (await mount(
      '<helix-headless-progress value="40"></helix-headless-progress>',
    )) as Host
    expect(host.shadowRoot?.querySelector('slot[name="label"]')?.parentNode).toBe(host.shadowRoot)
  })
})
