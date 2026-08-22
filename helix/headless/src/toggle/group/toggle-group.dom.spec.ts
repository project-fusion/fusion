import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  mount,
  part,
  registerDom,
  role,
  type Updatable,
} from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-base-toggle-group label="Color mode" default-value="light">
  <helix-base-toggle value="system">System</helix-base-toggle>
  <helix-base-toggle value="light">Light</helix-base-toggle>
  <helix-base-toggle value="dark">Dark</helix-base-toggle>
</helix-base-toggle-group>`

const items = (group: HTMLElement) =>
  [...group.querySelectorAll('helix-base-toggle')] as (HTMLElement & {
    selected: boolean
    value: string
  })[]

describe('toggle group', () => {
  test('is a radio group, named on internals rather than on the host', async () => {
    const group = await mount(markup)
    expect(role(group)).toBe('radiogroup')
    expect(group.hasAttribute('role')).toBe(false)
  })

  test('the value selects the matching item and no other', async () => {
    const group = await mount(markup)
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['light'])
  })

  test('choosing an item moves the selection and reports the new value', async () => {
    const group = await mount(markup)
    let seen = ''
    group.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })

    const dark = items(group)[2] as HTMLElement & { select: () => void }
    dark.select()
    await Promise.resolve()

    expect(seen).toBe('dark')
    expect(
      items(group)
        .filter((item) => item.selected)
        .map((item) => item.value),
    ).toEqual(['dark'])
  })

  test('the indicator is hidden from assistive technology', async () => {
    // It repeats the selection a radio group already announces.
    const group = await mount(markup)
    expect(part(group, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('toggle group in a form', () => {
  /* The group is a radio group, so it is a control, and a control that does not
     reach a form is decoration. None of this could work through the items: they
     draw `role="radio"` on buttons inside a shadow root, and a button submits
     nothing whatever its role, so the host is the only thing a form can see.

     These read what the group reported rather than what the form would submit.
     Turning a reported value into a `FormData` entry is the platform's job, and
     the test double does not do it; what belongs to the component is reporting
     the right value at the right moment. The whole path from a press to a
     submitted field was checked in a browser. */
  /* Parsed through `document.body`, not built detached and appended. happy-dom
     resolves `closest('form')` to nothing when the subtree was written with
     `innerHTML` on an element that was not in the document at the time, even
     though `parentElement` is the form: measured, `closest` returned null while
     the parent read `FORM`. Every spec here that finds its form does it this
     way, which is why the button's passed and the first draft of this did not. */
  const inForm = async (extra = ''): Promise<{ form: HTMLFormElement; group: Updatable }> => {
    document.body.innerHTML = `<form>
        <helix-base-toggle-group name="mode" label="Mode" ${extra}>
          <helix-base-toggle value="system">System</helix-base-toggle>
          <helix-base-toggle value="light">Light</helix-base-toggle>
          <helix-base-toggle value="dark">Dark</helix-base-toggle>
        </helix-base-toggle-group>
      </form>`
    const form = document.body.firstElementChild as HTMLFormElement
    const group = form.querySelector('helix-base-toggle-group') as Updatable
    await group.updateComplete
    return { form, group }
  }

  test('reports the chosen value', async () => {
    const { form, group } = await inForm('default-value="light"')
    expect(formValue(group)).toBe('light')

    ;(group as Updatable & { value: string }).value = 'dark'
    await group.updateComplete
    expect(formValue(group)).toBe('dark')
  })

  test('a reset returns it to the choice the markup declared', async () => {
    // `default-value` and `value` are separate for the reason `defaultChecked`
    // and `checked` are: where it started is gone the moment anything is picked.
    const { form, group } = await inForm('default-value="light"')
    ;(group as Updatable & { value: string }).value = 'dark'
    await group.updateComplete

    ;(group as Updatable & { formResetCallback: () => void }).formResetCallback()
    await group.updateComplete
    expect(formValue(group)).toBe('light')
  })

  test('the browser can put back a choice it restored', async () => {
    const { form, group } = await inForm('default-value="light"')
    ;(
      group as Updatable & { formStateRestoreCallback: (s: string | null) => void }
    ).formStateRestoreCallback('dark')
    await group.updateComplete
    expect(formValue(group)).toBe('dark')
  })

  test('nothing chosen reports nothing, rather than a blank', async () => {
    // `null` and `''` are different answers: one submits no field at all, the
    // other submits the field with an empty value.
    const { form, group } = await inForm()
    expect(formValue(group)).toBeNull()
  })

  test('the form owns it', async () => {
    const { form, group } = await inForm()
    expect((group as Updatable & { form: HTMLFormElement | null }).form).toBe(form)
  })
})

/* Geometry, which only a browser can answer.
 *
 * Guarded rather than written for happy-dom, where every rectangle is zero and
 * an assertion about where the thumb sits would pass against nothing at all.
 * These run in the sandbox's Specs panel, against the same file `bun test`
 * runs, which is the only place the answers mean anything.
 *
 * The fault they hold is a real one and was invisible for three attempts: the
 * offsets were measured from the group's border box, with
 * `getBoundingClientRect`, and applied from its padding box, which is where an
 * absolutely positioned element is placed. A border's width late on both axes,
 * which in a forty pixel track holding a thirty pixel thumb is six above it and
 * four below.
 */
if (hasLayout()) {
  describe('toggle group geometry', () => {
    /* The indicator is placed from a measurement and slides there, so the box it
       reports mid-flight is not the box it rests at.
 
       Ended rather than waited out. A sleep long enough to be safe went over the
       runner's two second budget, and one short enough to fit would pass only on
       a fast machine. Awaiting `finished` was worse in a way worth writing down:
       a transition in a document the browser is not painting is started and then
       never advanced, so the promise never settles and both specs hung. That is
       every backgrounded tab, not a quirk of one. `finish()` puts the transition
       at its end state synchronously and asks nothing of the timeline, so this
       reads the same geometry whether or not anyone is looking at it. */
    const settle = async (group: Updatable): Promise<void> => {
      await group.updateComplete
      for (const moving of (part(group, 'indicator') as HTMLElement).getAnimations()) {
        moving.finish()
      }
    }

    test('the thumb sits exactly on the segment it marks', async () => {
      const group = (await mount(markup)) as Updatable & { value: string }
      await settle(group)

      for (const value of ['system', 'light', 'dark']) {
        group.value = value
        await settle(group)

        const indicator = part(group, 'indicator') as HTMLElement
        const segment = group.querySelector(`helix-base-toggle[value="${value}"]`) as HTMLElement
        const marker = indicator.getBoundingClientRect()
        const target = segment.getBoundingClientRect()

        /* Before anything is compared, because every one of these compares two
           measurements and zero equals zero. An unlaid-out runner would pass all
           four while measuring nothing at all, which it did: this suite was
           green against a known misplacement until the frame was moved
           somewhere it gets laid out. */
        expect(target.width).toBeGreaterThan(0)
        expect(marker.width).toBeGreaterThan(0)

        expect(Math.abs(marker.left - target.left)).toBeLessThan(1)
        expect(Math.abs(marker.top - target.top)).toBeLessThan(1)
        expect(Math.abs(marker.width - target.width)).toBeLessThan(1)
        expect(Math.abs(marker.height - target.height)).toBeLessThan(1)
      }
    })

    test('the thumb is inset evenly on every side of the track', async () => {
      // Even gaps are the whole job of a thing sitting in a groove, and the
      // asymmetry this catches reads as "the spacing is off" rather than as a
      // misplacement, which is why it survived being looked at.
      const group = (await mount(markup)) as Updatable & { value: string }
      group.value = 'system'
      await settle(group)

      /* The track, not the host. The host is the whole stack now, a label and a
         hint included, so its box has not been the groove's box since the field
         parts landed. Measured against the host this asserted the inset from
         the top of a label, which is not a fact about anything. */
      const track = (part(group, 'track') as HTMLElement).getBoundingClientRect()
      expect(track.width).toBeGreaterThan(0)
      const marker = (part(group, 'indicator') as HTMLElement).getBoundingClientRect()
      const above = marker.top - track.top
      const below = track.bottom - marker.bottom
      const before = marker.left - track.left

      expect(Math.abs(above - below)).toBeLessThan(1)
      expect(Math.abs(above - before)).toBeLessThan(1)
    })
  })
}
