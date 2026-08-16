import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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
  (await mount(`<helix-progress label="Uploading" ${attrs}></helix-progress>`)) as Progress

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

  test('value text is announced beside the number, never instead of it', async () => {
    const bar = await progress('max="8" value="3" value-text="3 of 8 records"')
    expect(bar.internals?.ariaValueText).toBe('3 of 8 records')
    expect(bar.internals?.ariaValueNow).toBe('3')
  })

  test('no value text means none is announced, rather than an empty one', async () => {
    expect((await progress()).internals?.ariaValueText).toBeNull()
  })
})

if (hasLayout()) {
  describe('progress geometry', () => {
    test('the fill is a proportion of the track it is drawn in', async () => {
      /* Measured rather than read back from the property, because the fraction
         reaches the page as a `scale` and a transform that failed to apply
         leaves the element at its full width with the number still correct. */
      const bar = await progress('value="25"')
      const track = part(bar, 'track') as HTMLElement
      const fill = part(bar, 'indicator') as HTMLElement

      const width = track.getBoundingClientRect().width
      expect(width).toBeGreaterThan(0)
      expect(within(fill.getBoundingClientRect().width, width * 0.25, 1)).toBe(true)
    })

    test('it grows from the inline start, not the middle', async () => {
      const bar = await progress('value="25"')
      const track = part(bar, 'track') as HTMLElement
      const fill = part(bar, 'indicator') as HTMLElement
      const edge = track.getBoundingClientRect().left
      expect(within(fill.getBoundingClientRect().left, edge, 1)).toBe(true)
    })
  })
}
