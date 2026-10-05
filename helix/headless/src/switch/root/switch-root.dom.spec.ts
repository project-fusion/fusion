import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

describe('switch', () => {
  test('`click()` on the element toggles it, once, as it does a native checkbox', async () => {
    const host = (await mount('<helix-headless-switch>On</helix-headless-switch>')) as Updatable & {
      checked: boolean
    }
    const changes: boolean[] = []
    host.addEventListener('change', () => changes.push(host.checked))
    host.click()
    await host.updateComplete
    expect(host.checked).toBe(true)
    /* A press inside, on the control itself, still toggles it once. */
    control(host).click()
    await host.updateComplete
    expect(host.checked).toBe(false)
    expect(changes).toEqual([true, false])
  })

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

describe('a switch named on the host', () => {
  /* A settings row puts its words in another column and names the switch with
     `aria-label`, which stayed on the generic host: read from Chromium's tree,
     the switch itself had no name. */
  test('carries aria-label to the switch a reader is on', async () => {
    const host = await mount('<helix-headless-switch aria-label="Wi-Fi"></helix-headless-switch>')
    expect(control(host).getAttribute('aria-label')).toBe('Wi-Fi')
  })
})

describe('a read-only switch', () => {
  /* React Aria's isReadOnly. A native checkbox has no read-only state, so the
     press is refused at the inner control. */
  test('refuses a press on the control and on the host, and still submits', async () => {
    document.body.innerHTML =
      '<form><helix-headless-switch name="ok" readonly default-checked>Agree</helix-headless-switch></form>'
    const host = document.querySelector('helix-headless-switch') as Updatable & {
      checked: boolean
      readOnly: boolean
    }
    await settle(host)
    const heard: string[] = []
    host.addEventListener('change', () => heard.push('change'))
    ;(part(host, 'control') as HTMLInputElement).click()
    host.click()
    await settle(host)
    expect(host.checked).toBe(true)
    expect((part(host, 'control') as HTMLInputElement).checked).toBe(true)
    expect(heard).toEqual([])
    expect(part(host, 'control')?.getAttribute('aria-readonly')).toBe('true')
    expect(formValue(host)).toBe('on')
    host.readOnly = false
    await settle(host)
    ;(part(host, 'control') as HTMLInputElement).click()
    await settle(host)
    expect(host.checked).toBe(false)
    expect(part(host, 'control')?.hasAttribute('aria-readonly')).toBe(false)
  })
})
