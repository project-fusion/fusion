import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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

  test('a hint sits outside that label, so pressing it does not toggle', async () => {
    // Help text is not the control's name and must not be its hit target.
    const host = await mount('<helix-checkbox label="Accept" hint="Help"></helix-checkbox>')
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

describe('checkbox validation message', () => {
  /* Awaited until it stops, not once. Validity moves through
     `ElementInternals` rather than through a property, so the control reports
     it after rendering and the mixin schedules one further update to show what
     changed. Lit's `updateComplete` resolves `false` when that happens, which
     is the platform telling you there is more; a single await reads the state
     from before the message cleared. */
  const settle = async (host: Updatable): Promise<void> => {
    while ((await host.updateComplete) === false) {
      // Another update was requested while the last one was finishing.
    }
  }

  const required = async (): Promise<Updatable> => {
    document.body.innerHTML =
      '<form><helix-checkbox label="Accept" hint="Hint" name="terms" required></helix-checkbox></form>'
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
    expect(host.hasAttribute('data-invalid')).toBe(false)
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
    expect(host.hasAttribute('data-invalid')).toBe(true)
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
    expect(host.hasAttribute('data-invalid')).toBe(false)
  })
})

if (hasLayout()) {
  describe('checkbox geometry', () => {
    test('an unlabelled box carries no gap after it', async () => {
      /* The row is a flex line with a gap in it, so a label span rendered empty
         is still a box and still takes that gap. Measured at eight pixels of
         nothing after the box, which is what this is for.

         Only a browser can answer it: `slotchange` is what decides, and it does
         not fire without a real slot assignment. */
      /* Both in one mount, because `mount` replaces the body: measured
         separately, the first was detached by the time it was read, and a
         detached element reports zero for everything. Which the spec caught,
         by asking the box to be wider than nothing before comparing it. */
      const bare = (await mount(
        '<helix-checkbox></helix-checkbox><helix-checkbox label="Accept"></helix-checkbox>',
      )) as HTMLElement
      const labelled = bare.nextElementSibling as HTMLElement
      await (labelled as Updatable).updateComplete

      const rowOf = (host: HTMLElement): number =>
        (part(host, 'field') as HTMLElement).getBoundingClientRect().width
      const boxOf = (host: HTMLElement): number =>
        (part(host, 'control') as HTMLElement).getBoundingClientRect().width

      expect(boxOf(bare)).toBeGreaterThan(0)
      // The row is the box and nothing else, to within a subpixel.
      expect(Math.abs(rowOf(bare) - boxOf(bare))).toBeLessThan(1)
      // And a labelled one is wider, so the collapse is not hiding real labels.
      expect(rowOf(labelled)).toBeGreaterThan(rowOf(bare))
    })

    test('slotted words keep the room, with no property set', async () => {
      // The case gating on the property would have broken: a checkbox named by
      // its own content, which is how every checkbox was written before `label`.
      const host = await mount('<helix-checkbox>Accept</helix-checkbox>')
      expect(host.hasAttribute('data-has-label')).toBe(true)
      expect(getComputedStyle(part(host, 'label') as HTMLElement).display).not.toBe('none')
    })

    test('an invalid box is ringed in the danger colour', async () => {
      /* The focused-and-invalid ring cannot be asserted here: `:focus-visible`
         needs genuine keyboard focus, which no script can grant. What is
         checked is the resting ring and that its colour is the message's. */
      const host = (await mount(
        '<helix-checkbox label="Accept" name="t" required></helix-checkbox>',
      )) as Updatable
      host.dispatchEvent(new Event('invalid'))
      while ((await host.updateComplete) === false) {
        // Validity moves outside the property system, so this takes two passes.
      }
      const ring = getComputedStyle(part(host, 'control') as HTMLElement)
      const message = getComputedStyle(part(host, 'feedback') as HTMLElement)
      expect(ring.outlineStyle).toBe('solid')
      expect(ring.outlineColor).toBe(message.color)
    })
  })
}
