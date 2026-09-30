import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
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

type Checkbox = HTMLElement & {
  checked: boolean
  indeterminate: boolean
  updateComplete: Promise<unknown>
}

const checkbox = async (attrs = ''): Promise<Checkbox> =>
  (await mount(`<helix-headless-checkbox ${attrs}>Terms</helix-headless-checkbox>`)) as Checkbox

const control = (box: Checkbox): HTMLInputElement => part(box, 'control') as HTMLInputElement

describe('checkbox', () => {
  test('`click()` on the element toggles it, as it does a native checkbox', async () => {
    const box = await checkbox()
    box.click()
    await box.updateComplete
    expect(box.checked).toBe(true)
    expect(control(box).checked).toBe(true)
  })

  test('its mark says checked and indeterminate in part names, and only while they hold', async () => {
    /* For the box a component draws in its own shadow root, where nothing can
       name the host to reach `:state(checked)`. */
    const box = (await mount(
      '<helix-headless-checkbox label="Tea"></helix-headless-checkbox>',
    )) as HTMLElement & {
      checked: boolean
      indeterminate: boolean
      updateComplete: Promise<unknown>
    }
    const names = (): string => part(box, 'mark')?.getAttribute('part') ?? ''
    expect(names()).toBe('mark')
    box.checked = true
    await box.updateComplete
    expect(names()).toBe('mark mark-checked')
    box.checked = false
    box.indeterminate = true
    await box.updateComplete
    expect(names()).toBe('mark mark-indeterminate')
  })

  test('is a real input, so the platform gives it the space key and the tick', async () => {
    const box = await checkbox()
    expect(control(box).type).toBe('checkbox')
  })

  test('`default-checked` holds without a lifecycle, so the server agrees', async () => {
    // Seeding it on connect would render unchecked on the server and snap
    // checked at hydration, because SSR never calls that hook.
    const box = await checkbox('default-checked')
    expect(box.checked).toBe(true)
    expect(control(box).checked).toBe(true)
  })

  test('changing announces before it acts, and a refusal holds the state', async () => {
    const box = await checkbox()
    box.addEventListener('helix-before-toggle', (event) => {
      event.preventDefault()
    })
    control(box).click()
    await box.updateComplete
    expect(box.checked).toBe(false)
    // The input flipped itself first, so it is put back to what the element
    // holds. Otherwise the box shows a state the element refused.
    expect(control(box).checked).toBe(false)
  })

  /* The reason `Toggle` exists: reported through `helix-change` the
     payload was `String(checked)`, and the string "false" is truthy. A test
     asserting the value passes on that bug, so this asserts the type. */
  test('announces a boolean, and not a word that reads like one', async () => {
    const box = await checkbox()
    let seen: unknown = 'unset'
    box.addEventListener('helix-before-toggle', (event) => {
      seen = event.detail.checked
    })

    control(box).click()
    await box.updateComplete

    expect(seen).toBe(true)
    expect(typeof seen).toBe('boolean')
  })

  test('a box whose markup declared `checked` still moves, the property being a seed', async () => {
    /* Control is an action: the element applies, and a consumer takes the
       decision by refusing it. */
    const box = await checkbox('checked')
    control(box).click()
    await box.updateComplete
    expect(box.checked).toBe(false)
  })

  test('and refusing the toggle is what holds it, whoever declared it', async () => {
    const box = await checkbox('checked')
    box.addEventListener('helix-before-toggle', (event: Event) => {
      event.preventDefault()
    })
    control(box).click()
    await box.updateComplete
    expect(box.checked).toBe(true)
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
    const host = await mount('<helix-headless-checkbox label="Accept"></helix-headless-checkbox>')
    const field = part(host, 'field') as HTMLElement
    const label = part(host, 'label') as HTMLElement
    expect(field.tagName).toBe('LABEL')
    expect(field.contains(label)).toBe(true)
    expect(label.textContent?.trim()).toBe('Accept')
  })

  test('a hint sits outside that label, so pressing it does not toggle', async () => {
    // Help text is not the control's name and must not be its hit target.
    const host = await mount(
      '<helix-headless-checkbox label="Accept" hint="Help"></helix-headless-checkbox>',
    )
    const field = part(host, 'field') as HTMLElement
    const hint = part(host, 'hint') as HTMLElement
    expect(field.contains(hint)).toBe(false)
    expect((part(host, 'control') as HTMLInputElement).getAttribute('aria-describedby')).toContain(
      hint.id,
    )
  })
})

describe('checkbox label fallback', () => {
  test('slotted words win over the property', async () => {
    const host = await mount(
      '<helix-headless-checkbox label="Ignored">Slotted</helix-headless-checkbox>',
    )
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes()[0]?.textContent).toBe('Slotted')
  })

  test('the property is what shows when nothing is slotted', async () => {
    /* Written closed on the same line, and that is the assertion as much as the
       expectation is. A whitespace-only text node is assigned to the default
       slot and defeats its fallback, so a newline between the tags costs the
       label with nothing to say it did. */
    const host = await mount('<helix-headless-checkbox label="Accept"></helix-headless-checkbox>')
    const slot = (part(host, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedNodes().length).toBe(0)
    expect(slot.textContent?.trim()).toBe('Accept')
  })
})

/**
 * A name from the host's `aria-label`, which is the only way a box with no
 * words beside it is named. The host is not what a reader is on: the input is,
 * and the `<label>` around it is what names it.
 */
const browser = hasLayout() ? test : (): void => {}

describe('checkbox named by aria-label', () => {
  const label = (host: HTMLElement): HTMLElement => part(host, 'label') as HTMLElement

  test('draws the name into the label, clipped, and leaves no room for it', async () => {
    const host = await mount(
      '<helix-headless-checkbox aria-label="Select delta"></helix-headless-checkbox>',
    )
    expect(label(host).textContent?.trim()).toBe('Select delta')
    expect(label(host).hasAttribute('data-hidden')).toBe(true)
    expect(hasState(host, 'has-label')).toBe(false)
  })

  /* Browser only: happy-dom leaves a slot's fallback out of a flattened
     `assignedNodes`, so it reads every label drawn from a string as empty and
     hides it. In Chromium the fallback counts, which is what keeps the name in
     the tree: `hidden` would take it out, where the clip only takes it off
     screen. */
  browser('keeps the clipped label in the tree', async () => {
    const host = await mount(
      '<helix-headless-checkbox aria-label="Select delta"></helix-headless-checkbox>',
    )
    expect(label(host).hasAttribute('hidden')).toBe(false)
  })

  test('shows the words a consumer wrote, which win over the attribute', async () => {
    const host = await mount(
      '<helix-headless-checkbox aria-label="Ignored">Terms</helix-headless-checkbox>',
    )
    expect(label(host).hasAttribute('data-hidden')).toBe(false)
    expect(hasState(host, 'has-label')).toBe(true)
  })

  test('takes a new name when the attribute changes', async () => {
    /* What a column move does to every row's box in Data Table. */
    const host = (await mount(
      '<helix-headless-checkbox aria-label="Select delta"></helix-headless-checkbox>',
    )) as Updatable
    host.setAttribute('aria-label', 'Select 200')
    await settle(host)
    expect(label(host).textContent?.trim()).toBe('Select 200')
  })
})

describe('checkbox validation message', () => {
  const required = async (): Promise<Updatable> => {
    document.body.innerHTML =
      '<form><helix-headless-checkbox label="Accept" hint="Hint" name="terms" required></helix-headless-checkbox></form>'
    const host = (document.body.firstElementChild as HTMLElement).firstElementChild as Updatable
    await host.updateComplete
    return host
  }

  test('says nothing before the reader has had a go at it', async () => {
    /* A required box that starts unticked is not wrong yet, it is unanswered.
       Shouting at a reader who has not reached the control is the failure mode
       this whole state exists to avoid. */
    const host = await required()
    expect(part(host, 'feedback')).toBeNull()
    expect((part(host, 'hint') as HTMLElement).textContent?.trim()).toBe('Hint')
    expect(hasState(host, 'invalid')).toBe(false)
  })

  test("a failed submission puts the message in the hint's place", async () => {
    /* `invalid` is what the browser fires at every control that fails when a
       form is submitted, and it reaches the host. `:user-invalid` would be the
       natural thing to read instead and cannot work: it tracks interaction with
       the element it is on, and the reader interacts with an `<input>` inside
       the shadow root, so the host's flag is never set. Measured false after a
       real submission of an invalid required field. */
    const host = await required()
    host.dispatchEvent(new Event('invalid'))
    await settle(host)

    expect(part(host, 'hint')).toBeNull()
    expect((part(host, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Tick this box to continue.',
    )
    expect(hasState(host, 'invalid')).toBe(true)
  })

  test('answering it takes the message away again', async () => {
    // And the styled tier follows the same attribute, so the border and the
    // message cannot disagree about whether the field is wrong.
    const host = await required()
    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    ;(host as Updatable & { checked: boolean }).checked = true
    await settle(host)

    expect(part(host, 'feedback')).toBeNull()
    expect((part(host, 'hint') as HTMLElement).textContent?.trim()).toBe('Hint')
    expect(hasState(host, 'invalid')).toBe(false)
  })
})
