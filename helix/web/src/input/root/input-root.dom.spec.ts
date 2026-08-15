import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): HTMLInputElement | null =>
  part(host, 'control') as HTMLInputElement | null

describe('input', () => {
  test('is a real input, not a div pretending', async () => {
    // The caret, the selection, autofill and the keyboard a phone picks are all
    // the platform's, and none of them can be had from a styled div.
    const host = await mount('<helix-input label="Search"></helix-input>')
    expect(control(host)?.tagName).toBe('INPUT')
    expect(control(host)?.type).toBe('text')
  })

  test('the type reaches the input, which is what decides the keyboard', async () => {
    const host = await mount('<helix-input label="Email" type="email"></helix-input>')
    expect(control(host)?.type).toBe('email')
  })

  test('names itself for a screen reader when nothing else does', async () => {
    const host = await mount('<helix-input label="Search"></helix-input>')
    expect(control(host)?.getAttribute('aria-label')).toBe('Search')
  })

  test('disabled and read-only reach the control, not just the host', async () => {
    // A host attribute styles a thing; the control is what refuses the caret.
    const off = await mount('<helix-input label="A" disabled></helix-input>')
    expect(control(off)?.disabled).toBe(true)

    const frozen = await mount('<helix-input label="A" read-only></helix-input>')
    expect(control(frozen)?.readOnly).toBe(true)
  })

  test('typing reports the new value', async () => {
    const host = (await mount('<helix-input label="A" name="q"></helix-input>')) as Updatable
    const field = control(host) as HTMLInputElement
    field.value = 'hello'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect((host as Updatable & { value: string }).value).toBe('hello')
    expect(formValue(host)).toBe('hello')
  })

  test('a refused change puts the text back', async () => {
    /* The input has already taken the character by the time the event runs, so
       refusing it has to restore the field. Otherwise what is on screen and what
       the form would submit disagree, which is the one thing a field must never
       do. */
    const host = (await mount('<helix-input label="A" name="q"></helix-input>')) as Updatable
    host.addEventListener('helix-change', (event) => event.preventDefault())
    const field = control(host) as HTMLInputElement
    field.value = 'nope'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect((host as Updatable & { value: string }).value).toBe('')
    expect(field.value).toBe('')
  })
})

describe('input in a form', () => {
  const inForm = async (extra = ''): Promise<{ form: HTMLFormElement; host: Updatable }> => {
    // Parsed through the document: happy-dom resolves `closest('form')` to
    // nothing when the subtree was written with `innerHTML` on a detached
    // element, even though `parentElement` is the form.
    document.body.innerHTML = `<form><helix-input label="Q" name="q" ${extra}></helix-input></form>`
    const form = document.body.firstElementChild as HTMLFormElement
    const host = form.querySelector('helix-input') as Updatable
    await host.updateComplete
    return { form, host }
  }

  test('the form owns it', async () => {
    const { form, host } = await inForm()
    expect((host as Updatable & { form: HTMLFormElement | null }).form).toBe(form)
  })

  test('seeds from the value its markup declared', async () => {
    const { host } = await inForm('default-value="hello"')
    expect((host as Updatable & { value: string }).value).toBe('hello')
    expect(formValue(host)).toBe('hello')
  })

  test('a reset returns it to that value', async () => {
    const { host } = await inForm('default-value="hello"')
    ;(host as Updatable & { value: string }).value = 'typed over'
    await host.updateComplete

    ;(host as Updatable & { formResetCallback: () => void }).formResetCallback()
    await host.updateComplete
    expect(formValue(host)).toBe('hello')
  })

  test('the browser can put back a value it restored', async () => {
    const { host } = await inForm('default-value="hello"')
    ;(
      host as Updatable & { formStateRestoreCallback: (s: string | null) => void }
    ).formStateRestoreCallback('restored')
    await host.updateComplete
    expect(formValue(host)).toBe('restored')
  })

  test('an empty field still reports, unlike a box that is not ticked', async () => {
    // A checkbox submits nothing when it is off. A text field submits its
    // emptiness, because "" is an answer and the field was still on the form.
    const { host } = await inForm()
    expect(formValue(host)).toBe('')
  })
})
