import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, settle, type Updatable } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

describe('switch', () => {
  test('is a checkbox wearing the switch role, because it needs both halves', async () => {
    /* The input is what a form submits and what a label forwards a press to;
       the role is what a screen reader announces. Neither half can be got from
       the other, which is why this pairing rather than a button. */
    const host = await mount('<helix-headless-switch>On</helix-headless-switch>')
    expect(control(host).type).toBe('checkbox')
    expect(control(host).getAttribute('role')).toBe('switch')
  })

  test('off submits nothing rather than a blank', async () => {
    // Which is how a checkbox behaves, and is the difference between "no" and
    // "an empty answer".
    const off = await mount('<helix-headless-switch name="a" value="yes">A</helix-headless-switch>')
    expect(formValue(off)).toBeNull()

    const on = await mount(
      '<helix-headless-switch default-checked name="a" value="yes">A</helix-headless-switch>',
    )
    expect(formValue(on)).toBe('yes')
  })

  test('a refused change leaves the control where it was', async () => {
    const host = (await mount(
      '<helix-headless-switch name="a">A</helix-headless-switch>',
    )) as Updatable
    host.addEventListener('helix-before-toggle', (event) => event.preventDefault())
    const field = control(host)
    field.checked = true
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await host.updateComplete
    expect(field.checked).toBe(false)
  })

  test('required says so in its own words once asked', async () => {
    const host = (await mount(
      '<helix-headless-switch name="a" required>A</helix-headless-switch>',
    )) as Updatable
    await settle(host)
    expect(part(host, 'feedback')).toBeNull()

    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    expect((part(host, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Turn this on to continue.',
    )
  })
})
