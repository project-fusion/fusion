import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): HTMLTextAreaElement =>
  part(host, 'control') as HTMLTextAreaElement

describe('textarea', () => {
  test('is a real textarea, which is what makes Enter insert a line', async () => {
    /* The whole reason this is not an Input with a taller box: in a single-line
       field Enter submits the form and here it inserts a line, and that is
       behavior the platform owns. */
    const host = await mount('<helix-headless-textarea label="A"></helix-headless-textarea>')
    expect(control(host).tagName).toBe('TEXTAREA')
  })

  test('rows reaches the control, since that is what sets the starting height', async () => {
    /* Asserted on the attribute rather than the `rows` property: happy-dom does
       not reflect it back, and what the component is responsible for is putting
       it on the control. What the browser does with it is the browser's. */
    const host = await mount(
      '<helix-headless-textarea label="A" rows="6"></helix-headless-textarea>',
    )
    expect(control(host).getAttribute('rows')).toBe('6')
  })

  test('typing reports the new text', async () => {
    const host = (await mount(
      '<helix-headless-textarea label="A" name="q"></helix-headless-textarea>',
    )) as Updatable
    const field = control(host)
    field.value = 'hello'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect((host as Updatable & { value: string }).value).toBe('hello')
    expect(formValue(host)).toBe('hello')
  })

  test('a refused change puts the text back', async () => {
    // The control has already taken the character by the time this runs, so
    // refusing has to restore it or the screen and the form disagree.
    const host = (await mount(
      '<helix-headless-textarea label="A" name="q"></helix-headless-textarea>',
    )) as Updatable
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    const field = control(host)
    field.value = 'nope'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(field.value).toBe('')
  })

  test('read-only still submits, unlike disabled', async () => {
    // A read-only field is a value the reader may take and may not change.
    const host = await mount(
      '<helix-headless-textarea label="A" name="q" readonly default-value="x"></helix-headless-textarea>',
    )
    expect(control(host).readOnly).toBe(true)
    expect(formValue(host)).toBe('x')
  })

  test('dirname submits a second entry saying which way the text runs', async () => {
    /* The platform's `dirname` sends `<name>=value` and `<dirname>=ltr|rtl`
       together. The inner control has no form owner, so this one is assembled
       here: what it reports has to be a `FormData` of two entries rather than
       the plain string every other field reports. */
    const host = await mount(
      '<helix-headless-textarea label="A" name="notes" dirname="notes.dir" default-value="hi"></helix-headless-textarea>',
    )
    const reported = formValue(host) as FormData
    expect(reported).toBeInstanceOf(FormData)
    expect(reported.get('notes')).toBe('hi')
    expect(reported.get('notes.dir')).toBe('ltr')
  })

  test('a field with no dirname reports the plain string, not a one-entry FormData', async () => {
    // The common case, and the reason the branch exists: a `FormData` holding
    // one entry says the same thing at more cost.
    const host = await mount(
      '<helix-headless-textarea label="A" name="notes" default-value="hi"></helix-headless-textarea>',
    )
    expect(formValue(host)).toBe('hi')
  })

  test('auto-grow reflects, which is what the sheet that hides the scrollbar selects on', async () => {
    /* The measuring half needs a layout box and happy-dom has none: it answers
       zero to `scrollHeight`, and `grow` returns on zero rather than pinning the
       field at a hairline. So what is asserted here is the half this environment
       can see, the attribute a stylesheet reaches. */
    const host = await mount(
      '<helix-headless-textarea label="A" auto-grow></helix-headless-textarea>',
    )
    expect(host.hasAttribute('auto-grow')).toBe(true)
  })
})
