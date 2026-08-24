import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const marksOf = (host: HTMLElement): string[] =>
  [...((part(host, 'markers') as HTMLElement | null)?.children ?? [])].map((mark) =>
    (mark as HTMLElement).style.getPropertyValue('--slider-marker-at').trim(),
  )

describe('slider', () => {
  test('a control that was disabled can be enabled again', async () => {
    /* Re-enabling is the only way this shows. Reflecting `disabled` to the host
       attribute makes the UA call formDisabledCallback synchronously from
       inside Lit's update(), and a reactive write there is a change-in-update
       Lit does not re-render for, so `formDisabled` ran one update behind: the
       host went correct, `:disabled` stopped matching, and the inner control
       kept the attribute for good. Every form control in the library, and
       invisible to anything that only ever disables.
    
       **The callback is invoked here rather than awaited.** happy-dom does not
       implement form-associated disabling, so a spec that only sets `disabled`
       passes whether or not the bug is present: verified by putting the old
       one-liner back into the built output, where it still went green. What the
       UA contributes is this call, so the spec makes it. */
    const host = (await mount(
      '<helix-slider label="A" max="1" min="0" step="0.05"></helix-slider>',
    )) as Updatable & { disabled: boolean; formDisabledCallback: (off: boolean) => void }
    const control = () => part(host, 'control') as HTMLInputElement

    host.disabled = true
    host.formDisabledCallback(true)
    await host.updateComplete
    expect(control().disabled).toBe(true)

    host.disabled = false
    await host.updateComplete
    expect(control().disabled).toBe(false)
  })

  test('and a fieldset still holds it down when it was never disabled itself', async () => {
    /* The other half of the same line: what the fieldset adds is still recorded,
       or the fix would be "ignore the platform" rather than "take only the part
       that is not already ours". */
    const host = (await mount(
      '<helix-slider label="A" max="1" min="0"></helix-slider>',
    )) as Updatable & { disabled: boolean; formDisabledCallback: (off: boolean) => void }
    const control = () => part(host, 'control') as HTMLInputElement

    host.formDisabledCallback(true)
    await host.updateComplete
    expect(control().disabled).toBe(true)

    host.formDisabledCallback(false)
    await host.updateComplete
    expect(control().disabled).toBe(false)
  })

  test('an unset range starts in the middle, where the platform puts the thumb', async () => {
    /* Seeded before the first render so the value the form would submit matches
       the thumb from the start rather than from the first drag. */
    const host = await mount('<helix-slider label="A" max="100" min="0" name="q"></helix-slider>')
    expect(formValue(host)).toBe('50')
  })

  test('the fill is written as a fraction, on the control rather than the host', async () => {
    /* Arithmetic the component can do exactly, where a measurement of the thumb
       would be a guess at where the platform drew it.

       On the control, which is the correction. It was written onto the host's
       inline style from `updated()`, which made it the one host-attribute write
       in the library and put it in a hook Lit SSR never calls, so a
       server-rendered slider shipped with no fill at all until it hydrated. A
       custom property set in the render inherits into
       `::-webkit-slider-runnable-track` and `::-moz-range-track` just the same,
       which is why the stylesheet needed no change. */
    const host = await mount(
      '<helix-slider label="A" max="200" min="0" default-value="50"></helix-slider>',
    )
    const control = part(host, 'control')
    expect(control?.style.getPropertyValue('--slider-fraction')).toBe('0.25')
    expect(host.style.getPropertyValue('--slider-fraction')).toBe('')
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

  test('a labeled mark says the value it stands at', async () => {
    const host = (await mount(
      '<helix-slider label="A" marker-labels markers="3" max="100" min="0" step="50"></helix-slider>',
    )) as Updatable
    const labels = [
      ...(part(host, 'markers') as HTMLElement).querySelectorAll('[part="marker-label"]'),
    ]
    expect(labels.map((label) => label.textContent?.trim())).toEqual(['0', '50', '100'])
  })
})

describe('slider seeding', () => {
  test('a range with no value starts in the middle and still moves', async () => {
    /* The seed used to be a write to `value`, which under the controlled shape
       is how a consumer claims it: every range without a value would have
       declared itself controlled on its first render and frozen the thumb where
       it started. It seeds `defaultValue` instead, which is where the markup's
       intent lives, and "no value given" is a fact about the markup. */
    const host = (await mount(
      '<helix-slider label="Level" max="10" min="0"></helix-slider>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    await host.updateComplete
    expect(host.value).toBe('5')

    const range = host.shadowRoot?.querySelector('input') as HTMLInputElement
    range.value = '8'
    range.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(host.value).toBe('8')
  })
})

describe('slider bounds', () => {
  test('a value above 100 survives, because the bounds are written first', async () => {
    /* Lit commits bindings in template order and a range clamps to the bounds it
       holds at that moment, so with `.value` written before `max` a hue slider
       given 225 took the default max of 100 and kept 100. The fill went on
       reading 62.5 per cent, because that is arithmetic on this element's own
       property rather than on the input's, which is what made a value bug look
       like a drawing one. */
    const host = (await mount(
      '<helix-slider label="Hue" max="360" min="0" default-value="225"></helix-slider>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    await host.updateComplete
    const range = host.shadowRoot?.querySelector('input') as HTMLInputElement
    expect(range.max).toBe('360')
    expect(range.value).toBe('225')
    expect(host.value).toBe('225')
  })

  test('and it survives the bounds widening after the fact', async () => {
    // The same ordering has to hold on every update, not only the first.
    const host = (await mount(
      '<helix-slider label="Hue" max="100" min="0" default-value="50"></helix-slider>',
    )) as HTMLElement & { max: number; updateComplete: Promise<boolean>; value: string }
    await host.updateComplete
    host.max = 360
    host.value = '300'
    await host.updateComplete
    const range = host.shadowRoot?.querySelector('input') as HTMLInputElement
    expect(range.value).toBe('300')
  })

  test('and the fill keeps up with the value rather than trailing a render', async () => {
    /* The fill was arithmetic on the *control's* value, read inside `render()`,
       and the `style` binding carrying it commits before the `.value` binding
       below it. So it read the value the same render was about to replace, and
       on the first pass it read the seeded midpoint and stayed there.

       Measured on the bench before the fix: host `1`, control `1`, fraction
       `0.5`. Half a track out, and stable, which is why it read as a drawing
       bug. A 0-to-1 slider is the cheapest reproduction because the seeded
       midpoint and the wrong answer are the same number. */
    const host = (await mount(
      '<helix-slider label="Pointer" max="1" min="0" step="0.05"></helix-slider>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    await host.updateComplete

    const fill = () =>
      host.shadowRoot?.querySelector('input')?.style.getPropertyValue('--slider-fraction')

    host.value = '1'
    await host.updateComplete
    expect(fill()).toBe('1')

    host.value = '0'
    await host.updateComplete
    expect(fill()).toBe('0')

    host.value = '0.25'
    await host.updateComplete
    expect(fill()).toBe('0.25')
  })

  test('and an off-step value fills where the thumb will actually land', async () => {
    /* The DOM read this replaces was there for a reason: a range snaps what it
       is given, so arithmetic straight off `value` would fill somewhere the
       thumb never goes. The snapping is done here now, counted from `min`
       rather than from zero, which is how a range counts it.

       Only the fraction is asserted. happy-dom's range does not sanitize at
       all, reporting `1.03` where a browser reports `1.05`, so the control's
       own value here would be a test of the double rather than of this
       element. That gap is also why reading the control hid the bug: in this
       environment the stale read and the fresh one agree. */
    const host = (await mount(
      '<helix-slider label="Gain" max="2.5" min="0.2" step="0.05"></helix-slider>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    await host.updateComplete

    host.value = '1.03'
    await host.updateComplete
    const control = host.shadowRoot?.querySelector('input') as HTMLInputElement
    // 1.03 snaps to 1.05 from a min of 0.2, sixteen and a bit steps along.
    expect(control.style.getPropertyValue('--slider-fraction')).toBe(
      String((1.05 - 0.2) / (2.5 - 0.2)),
    )
  })
})
