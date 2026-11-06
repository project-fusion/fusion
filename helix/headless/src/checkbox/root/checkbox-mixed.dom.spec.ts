import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Checkbox = HTMLElement & {
  checked: boolean
  indeterminate: boolean
  updateComplete: Promise<unknown>
}

const checkbox = async (attrs = ''): Promise<Checkbox> =>
  (await mount(`<helix-headless-checkbox ${attrs}>Terms</helix-headless-checkbox>`)) as Checkbox

const control = (box: Checkbox): HTMLInputElement => part(box, 'control') as HTMLInputElement

/** A box whose every `helix-before-check` is refused. */
const refusing = async (attrs: string): Promise<Checkbox> => {
  const box = await checkbox(attrs)
  box.addEventListener('helix-before-check', (event) => event.preventDefault())
  return box
}

describe('a refused press on an indeterminate checkbox', () => {
  /* The native click clears the input's own `indeterminate` before the
     element hears it, and the element's property never moved, so the template
     binding has nothing new to write. Assistive technology reads the input:
     left cleared, it says "not checked" under a box that draws the dash. */
  test('leaves the inner input mixed, as the element still is', async () => {
    const box = await refusing('indeterminate')
    control(box).click()
    await box.updateComplete
    expect(box.indeterminate).toBe(true)
    expect(control(box).indeterminate).toBe(true)
    expect(control(box).checked).toBe(false)
  })

  test('leaves it mixed over a checked state too', async () => {
    const box = await refusing('indeterminate checked')
    control(box).click()
    await box.updateComplete
    expect([box.indeterminate, box.checked]).toEqual([true, true])
    expect([control(box).indeterminate, control(box).checked]).toEqual([true, true])
  })

  test('leaves it mixed after a press on the host, which reaches the input', async () => {
    const box = await refusing('indeterminate')
    box.click()
    await box.updateComplete
    expect(control(box).indeterminate).toBe(true)
  })

  test('and a press nobody refuses still resolves the input with the element', async () => {
    const box = await checkbox('indeterminate')
    let refuse = true
    box.addEventListener('helix-before-check', (event) => {
      if (refuse) {
        event.preventDefault()
      }
    })
    control(box).click()
    await box.updateComplete
    refuse = false
    control(box).click()
    await box.updateComplete
    expect([box.indeterminate, box.checked]).toEqual([false, true])
    expect([control(box).indeterminate, control(box).checked]).toEqual([false, true])
  })
})

describe('an indeterminate checkbox in a form', () => {
  /* The dash is presentation, so the form reads the state under it, as it
     does for a native checkbox. */
  test('submits its value where it is checked under the dash, and nothing where it is not', async () => {
    const checked = await checkbox('name="terms" indeterminate checked')
    expect(formValue(checked)).toBe('on')
    const unchecked = await checkbox('name="terms" indeterminate')
    expect(formValue(unchecked)).toBeNull()
  })
})
