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

describe('checkbox descriptions', () => {
  test('the label stays inside the field, where pressing it toggles the box', async () => {
    /* The one geometry that differs. A checkbox is named by the words beside it
       and the `<label>` around both is what forwards the press, so the label
       cannot be the standalone `<label for>` an input renders: nesting one in
       the other is invalid markup and the inner one would swallow the press. */
    const host = await mount('<helix-checkbox label="Accept"></helix-checkbox>')
    const field = part(host, 'field') as HTMLElement
    const label = part(host, 'label') as HTMLElement
    expect(field.tagName).toBe('LABEL')
    expect(field.contains(label)).toBe(true)
    expect(label.textContent?.trim()).toBe('Accept')
  })

  test('a caption sits outside that label, so pressing it does not toggle', async () => {
    // Help text is not the control's name and must not be its hit target.
    const host = await mount('<helix-checkbox label="Accept" caption="Help"></helix-checkbox>')
    const field = part(host, 'field') as HTMLElement
    const caption = part(host, 'caption') as HTMLElement
    expect(field.contains(caption)).toBe(false)
    expect((part(host, 'control') as HTMLInputElement).getAttribute('aria-describedby')).toContain(
      caption.id,
    )
  })
})

describe('checkbox label fallback', () => {
  test('slotted words win over the property', async () => {
    const host = await mount('<helix-checkbox label="Ignored">Slotted</helix-checkbox>')
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes()[0]?.textContent).toBe('Slotted')
  })

  test('the property is what shows when nothing is slotted', async () => {
    /* Written closed on the same line, and that is the assertion as much as the
       expectation is. A whitespace-only text node is assigned to the default
       slot and defeats its fallback, so a newline between the tags costs the
       label with nothing to say it did. */
    const host = await mount('<helix-checkbox label="Accept"></helix-checkbox>')
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes().length).toBe(0)
    expect(slot.textContent?.trim()).toBe('Accept')
  })
})
