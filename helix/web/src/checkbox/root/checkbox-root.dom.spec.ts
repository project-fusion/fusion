import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Checkbox = HTMLElement & {
  isChecked: boolean
  checked: boolean | undefined
  indeterminate: boolean
  updateComplete: Promise<unknown>
}

const checkbox = async (attrs = ''): Promise<Checkbox> =>
  (await mount(`<helix-checkbox ${attrs}>Terms</helix-checkbox>`)) as Checkbox

const control = (box: Checkbox): HTMLInputElement => part(box, 'control') as HTMLInputElement

describe('checkbox', () => {
  test('is a real input, so the platform gives it the space key and the tick', async () => {
    const box = await checkbox()
    expect(control(box).type).toBe('checkbox')
  })

  test('`default-checked` holds without a lifecycle, so the server agrees', async () => {
    // Seeding it on connect would render unchecked on the server and snap
    // checked at hydration, because SSR never calls that hook.
    const box = await checkbox('default-checked')
    expect(box.isChecked).toBe(true)
    expect(control(box).checked).toBe(true)
  })

  test('changing announces before it acts, and a refusal holds the state', async () => {
    const box = await checkbox()
    box.addEventListener('helix-change', (event) => {
      event.preventDefault()
    })
    control(box).click()
    await box.updateComplete
    expect(box.isChecked).toBe(false)
    // The input flipped itself first, so it is put back to what the element
    // holds. Otherwise the box shows a state the element refused.
    expect(control(box).checked).toBe(false)
  })

  test('a controlled box does not move itself', async () => {
    // Setting `checked` is what enters controlled mode, and from there the
    // consumer owns the value.
    const box = await checkbox('checked')
    control(box).click()
    await box.updateComplete
    expect(box.isChecked).toBe(true)
  })

  test('the native change is relayed, so `onChange` reaches a consumer', async () => {
    const box = await checkbox()
    let relayed = 0
    box.addEventListener('change', () => {
      relayed += 1
    })
    control(box).click()
    expect(relayed).toBe(1)
  })

  test('the first change resolves indeterminate', async () => {
    // A third state that survives interaction is a control nobody can finish.
    const box = await checkbox('indeterminate')
    expect(box.indeterminate).toBe(true)
    control(box).click()
    await box.updateComplete
    expect(box.indeterminate).toBe(false)
  })

  test('required is announced, not only enforced', async () => {
    const box = (await checkbox('required')) as Checkbox & { internals?: ElementInternals }
    expect(box.internals?.ariaRequired).toBe('true')
    expect(box.getAttributeNames().includes('required')).toBe(true)
  })
})
