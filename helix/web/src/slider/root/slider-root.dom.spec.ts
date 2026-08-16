import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const marksOf = (host: HTMLElement): string[] =>
  [...((part(host, 'markers') as HTMLElement | null)?.children ?? [])].map((mark) =>
    (mark as HTMLElement).style.getPropertyValue('--_marker-at').trim(),
  )

describe('slider', () => {
  test('an unset range starts in the middle, where the platform puts the thumb', async () => {
    /* Seeded before the first render so the value the form would submit matches
       the thumb from the start rather than from the first drag. */
    const host = await mount('<helix-slider label="A" max="100" min="0" name="q"></helix-slider>')
    expect(formValue(host)).toBe('50')
  })

  test('the fill is written as a fraction, not measured off the thumb', async () => {
    // Arithmetic the component can do exactly, where a measurement of the thumb
    // would be a guess at where the platform drew it.
    const host = await mount(
      '<helix-slider label="A" max="200" min="0" default-value="50"></helix-slider>',
    )
    expect(host.style.getPropertyValue('--_slider-fraction')).toBe('0.25')
  })
})

describe('slider markers', () => {
  test('every mark lands on a step, even when that makes them uneven', async () => {
    /* Evenly spaced and on a step are two different things: four marks across a
       hundred in twenty-fives wants them at 0, 33.3, 66.7 and 100, and two of
       those are places the thumb cannot go. A mark the thumb can never sit on
       is the one thing a mark must not be, so the spacing gives way. */
    const host = await mount(
      '<helix-slider label="A" markers="4" max="100" min="0" step="25"></helix-slider>',
    )
    expect(marksOf(host)).toEqual(['0%', '25%', '75%', '100%'])
  })

  test('marks that snap onto each other become one', async () => {
    // Two marks in one place read as one drawn badly.
    const host = await mount(
      '<helix-slider label="A" markers="5" max="10" min="0" step="5"></helix-slider>',
    )
    expect(marksOf(host)).toEqual(['0%', '50%', '100%'])
  })

  test('fewer than two marks draws none, because one says nothing about a range', async () => {
    const host = await mount('<helix-slider label="A" markers="1"></helix-slider>')
    expect(part(host, 'markers')).toBeNull()
  })

  test('a labelled mark says the value it stands at', async () => {
    const host = (await mount(
      '<helix-slider label="A" marker-labels markers="3" max="100" min="0" step="50"></helix-slider>',
    )) as Updatable
    const labels = [
      ...(part(host, 'markers') as HTMLElement).querySelectorAll('[part="marker-label"]'),
    ]
    expect(labels.map((label) => label.textContent?.trim())).toEqual(['0', '50', '100'])
  })
})
