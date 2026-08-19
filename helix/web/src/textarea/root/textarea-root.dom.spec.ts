import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

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
    const host = await mount('<helix-textarea label="A"></helix-textarea>')
    expect(control(host).tagName).toBe('TEXTAREA')
  })

  test('rows reaches the control, since that is what sets the starting height', async () => {
    /* Asserted on the attribute rather than the `rows` property: happy-dom does
       not reflect it back, and what the component is responsible for is putting
       it on the control. What the browser does with it is the browser's. */
    const host = await mount('<helix-textarea label="A" rows="6"></helix-textarea>')
    expect(control(host).getAttribute('rows')).toBe('6')
  })

  test('typing reports the new text', async () => {
    const host = (await mount('<helix-textarea label="A" name="q"></helix-textarea>')) as Updatable
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
    const host = (await mount('<helix-textarea label="A" name="q"></helix-textarea>')) as Updatable
    host.addEventListener('helix-input', (event) => event.preventDefault())
    const field = control(host)
    field.value = 'nope'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(field.value).toBe('')
  })

  test('read-only still submits, unlike disabled', async () => {
    // A read-only field is a value the reader may take and may not change.
    const host = await mount(
      '<helix-textarea label="A" name="q" read-only default-value="x"></helix-textarea>',
    )
    expect(control(host).readOnly).toBe(true)
    expect(formValue(host)).toBe('x')
  })
})
