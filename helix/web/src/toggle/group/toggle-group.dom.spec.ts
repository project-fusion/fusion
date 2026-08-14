import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, role, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-toggle-group label="Color mode" value="light">
  <helix-toggle value="system">System</helix-toggle>
  <helix-toggle value="light">Light</helix-toggle>
  <helix-toggle value="dark">Dark</helix-toggle>
</helix-toggle-group>`

const items = (group: HTMLElement) =>
  [...group.querySelectorAll('helix-toggle')] as (HTMLElement & {
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
        <helix-toggle-group name="mode" label="Mode" ${extra}>
          <helix-toggle value="system">System</helix-toggle>
          <helix-toggle value="light">Light</helix-toggle>
          <helix-toggle value="dark">Dark</helix-toggle>
        </helix-toggle-group>
      </form>`
    const form = document.body.firstElementChild as HTMLFormElement
    const group = form.querySelector('helix-toggle-group') as Updatable
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
