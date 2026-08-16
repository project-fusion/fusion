import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  mount,
  part,
  registerDom,
  type Updatable,
} from '@fusion-io/testing/dom'

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

  test('names itself with a label the reader can press', async () => {
    /* A real `<label for>` rather than `aria-label`, which named the field for a
       screen reader and showed a sighted reader nothing at all. `for` resolves
       because ids are scoped to the tree holding them, and both are in this
       shadow root, so the browser does the focus forwarding with no handler. */
    const host = await mount('<helix-input label="Search"></helix-input>')
    const label = part(host, 'label') as HTMLLabelElement
    expect(label.textContent?.trim()).toBe('Search')
    expect(label.getAttribute('for')).toBe(control(host)?.id)
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

describe('input descriptions', () => {
  test('a hint is described, not just shown', async () => {
    const host = await mount('<helix-input label="A" hint="Help text"></helix-input>')
    const hint = part(host, 'hint') as HTMLElement
    expect(hint.textContent?.trim()).toBe('Help text')
    expect(control(host)?.getAttribute('aria-describedby')).toContain(hint.id)
  })

  test("feedback takes the hint's place rather than stacking under it", async () => {
    /* One line under the field either way, so nothing below it moves when the
       message arrives, and what the reader is given at that moment is what is
       wrong rather than a hint to read first. */
    const host = await mount(
      '<helix-input label="A" hint="At least 12 characters" feedback="Too short"></helix-input>',
    )
    expect(part(host, 'hint')).toBeNull()
    const feedback = part(host, 'feedback') as HTMLElement
    expect(feedback.textContent?.trim()).toBe('Too short')

    // And the control names only what is actually there. Pointing at both would
    // name an id that resolves to nothing.
    expect(control(host)?.getAttribute('aria-describedby')).toBe(feedback.id)
  })

  test('the hint comes back when there is nothing wrong', async () => {
    const host = (await mount(
      '<helix-input label="A" hint="At least 12 characters" feedback="Too short"></helix-input>',
    )) as Updatable & { feedback: string }
    host.feedback = ''
    await host.updateComplete
    expect((part(host, 'hint') as HTMLElement).textContent?.trim()).toBe('At least 12 characters')
    expect(part(host, 'feedback')).toBeNull()
  })

  test('nothing to say means no description at all', async () => {
    // Rather than an `aria-describedby` pointing at an id that renders nothing,
    // which a screen reader reads as a field with a description it cannot find.
    const host = await mount('<helix-input label="A"></helix-input>')
    expect(part(host, 'hint')).toBeNull()
    expect(part(host, 'feedback')).toBeNull()
    expect(control(host)?.hasAttribute('aria-describedby')).toBe(false)
  })

  test('a consumer message wins over the platform', async () => {
    const host = (await mount(
      '<helix-input label="A" name="q" required feedback="We need this one"></helix-input>',
    )) as Updatable
    expect((part(host, 'feedback') as HTMLElement).textContent?.trim()).toBe('We need this one')
  })

  test('the label is content, so slotting replaces it rather than adding to it', async () => {
    /* Asserted through the slot rather than through `textContent`, which walks
       the DOM tree and so reports fallback content whether or not it renders.
       What decides is assignment: anything assigned means the fallback is not
       shown, which is the platform answering "was I given a label" with no
       property, no attribute, and nothing for a server and a client to
       disagree about. */
    const given = await mount(
      '<helix-input label="Ignored"><span slot="label">Slotted</span></helix-input>',
    )
    const slot = (part(given, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(slot.assignedElements().length).toBe(1)
    expect(slot.assignedElements()[0]?.textContent).toBe('Slotted')

    const bare = await mount('<helix-input label="Used"></helix-input>')
    const empty = (part(bare, 'label') as HTMLElement).querySelector('slot') as HTMLSlotElement
    expect(empty.assignedElements().length).toBe(0)
    expect(empty.textContent?.trim()).toBe('Used')
  })
})

describe('input parts that are not always used', () => {
  test('no label means no label element', async () => {
    // Not an empty one. An element rendered empty still generates a box, so it
    // still takes a row of the grid and a gap on either side of it.
    const host = await mount('<helix-input placeholder="Search"></helix-input>')
    expect(part(host, 'label')).toBeNull()
  })

  test('aria-label names the control without drawing a label', async () => {
    /* Forwarded rather than left on the host. A custom element cannot hand a
       label to the control inside it, so an `aria-label` on the wrapper reaches
       nothing: measured, the inner input came back with no label at all. The
       mixin renders it clipped instead, so the name arrives through the same
       `<label for>` a visible one does, and an unnamed field is not announced
       as "edit text". */
    const host = await mount('<helix-input aria-label="Filter"></helix-input>')
    const label = part(host, 'label') as HTMLLabelElement
    expect(label).not.toBeNull()
    expect(label.hasAttribute('data-hidden')).toBe(true)
    expect(label.getAttribute('for')).toBe(control(host)?.id)
    expect(control(host)?.labels?.length).toBe(1)
    expect(label.textContent?.trim()).toBe('Filter')
  })

  test('a visible label is not marked hidden', async () => {
    const host = await mount('<helix-input label="Filter"></helix-input>')
    expect((part(host, 'label') as HTMLElement).hasAttribute('data-hidden')).toBe(false)
  })

  test('the description sits under the control, whichever of the two it is', async () => {
    const order = async (markup: string): Promise<(string | null)[]> => {
      const host = await mount(markup)
      return [...(host.shadowRoot as ShadowRoot).children].map((node) => node.getAttribute('part'))
    }
    expect(await order('<helix-input label="A" hint="H"></helix-input>')).toEqual([
      'label',
      'field',
      'hint',
    ])
    expect(await order('<helix-input label="A" hint="H" feedback="F"></helix-input>')).toEqual([
      'label',
      'field',
      'feedback',
    ])
  })
})

if (hasLayout()) {
  describe('input field geometry', () => {
    const heightOf = async (markup: string): Promise<number> => {
      const host = await mount(markup)
      return host.getBoundingClientRect().height
    }

    test('an unused slot costs no gap', async () => {
      /* The reason `renderLabel` returns `nothing` rather than an empty
         element. The host is a grid with a gap between its rows, so anything
         rendered empty still takes a row and a gap, and the field moves down
         the page for a label nobody wrote. `nothing` leaves comment markers,
         which generate no box, so the gap has nothing to sit between.

         The assertion is that a bare host is exactly its field and no taller.
         It was `bare < labelled` first, which is true either way: an empty
         label is still shorter than a real one, so that version passed against
         the bug it was written for. Checked by putting the bug back. */
      const host = await mount('<helix-input placeholder="P"></helix-input>')
      const field = part(host, 'field') as HTMLElement
      const outer = host.getBoundingClientRect().height
      const inner = field.getBoundingClientRect().height

      expect(inner).toBeGreaterThan(0)
      expect(Math.abs(outer - inner)).toBeLessThan(1)
    })

    test('the field never hangs past its own element', async () => {
      /* A real `<input>` has a min-content width of about twenty characters, so
         any layout that floors the field at its content makes the field wider
         than the host holding it. It hung five pixels past, which ate the gap
         after it and overlapped the control beside it by one. Nothing inside
         the component looked wrong; what looked wrong was the spacing of the
         thing next to it, which is why this is measured from the outside.

         Narrower than the field wants to be, which is the only width that can
         tell the two layouts apart. */
      document.body.innerHTML =
        '<div style="inline-size:120px"><helix-input label="L" placeholder="P"></helix-input></div>'
      const host = document.body.firstElementChild?.firstElementChild as Updatable
      await host.updateComplete
      const field = part(host as HTMLElement, 'field') as HTMLElement

      const outer = host.getBoundingClientRect()
      const inner = field.getBoundingClientRect()
      expect(outer.width).toBeGreaterThan(0)
      expect(inner.right - outer.right).toBeLessThan(1)
      expect(outer.left - inner.left).toBeLessThan(1)
    })

    test('an error is one edge, not a red border inside a blue ring', async () => {
      /* Only a browser can answer this: it is entirely a question of which rule
         wins, and happy-dom resolves no cascade for `:focus-within`.

         Both faults it covers are specificity. `[data-invalid]` unnamed by
         hover is (0,3,0) against hover's (0,4,0), so pointing at a field with
         an error in it put the grey border back. And the focus rule owns the
         `outline`, so a focused error came out red inside blue, which is the
         double-struck look the focus rule exists to prevent arriving by another
         route. The two are one edge, so they have to agree. */
      const host = await mount('<helix-input label="A" feedback="Wrong"></helix-input>')
      const field = part(host, 'field') as HTMLElement
      host.focus()

      const style = getComputedStyle(field)
      expect(host.hasAttribute('data-invalid')).toBe(true)
      expect(field.matches(':focus-within')).toBe(true)
      expect(style.outlineStyle).not.toBe('none')
      expect(style.outlineColor).toBe(style.borderTopColor)
    })

    test('a field with every part is taller than one with none, by all of them', async () => {
      const bare = await heightOf('<helix-input placeholder="P"></helix-input>')
      const full = await heightOf('<helix-input label="L" hint="C" feedback="F"></helix-input>')
      const labelOnly = await heightOf('<helix-input label="L"></helix-input>')

      expect(full).toBeGreaterThan(labelOnly)
      expect(labelOnly).toBeGreaterThan(bare)
    })
  })
}

describe('input, controlled and uncontrolled', () => {
  const control = (host: HTMLElement): HTMLInputElement => {
    const found = host.shadowRoot?.querySelector('input')
    if (!found) {
      throw new Error('the field rendered no input, so there is nothing to type into')
    }
    return found
  }

  const typed = async (host: HTMLElement, text: string): Promise<void> => {
    const field = control(host)
    field.value = text
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
  }

  const native = (host: HTMLElement): string => control(host).value

  test('a script may set an uncontrolled value without taking it over', async () => {
    /* What a native input does: `element.value = x` sets the value and the
       field keeps working. It did not, because any write was read as the
       consumer claiming ownership, so one line of script froze the field for
       the rest of the page's life. Which mode an element is in is read once, at
       the first update, from whether anything had declared one by then; a write
       after that is just a write. */
    const host = (await mount('<helix-input label="Name"></helix-input>')) as HTMLElement & {
      updateComplete: Promise<boolean>
      value: string
    }
    await host.updateComplete

    host.value = 'set by a script'
    await host.updateComplete
    expect(host.value).toBe('set by a script')

    await typed(host, 'then typed')
    expect(host.value).toBe('then typed')
  })

  test('a controlled value is still the consumer’s to change', async () => {
    const host = (await mount(
      '<helix-input label="Name" value="mine"></helix-input>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    await host.updateComplete

    await typed(host, 'tried')
    expect(host.value).toBe('mine')

    host.value = 'handed back'
    await host.updateComplete
    expect(host.value).toBe('handed back')
  })

  test('typing does not quietly hand the value to nobody', async () => {
    /* Writing `value` is how a consumer says they own it, so a control that
       wrote its own would declare itself controlled on the first keystroke and
       ignore every request after that.

       Two keystrokes does not see it, which is worth recording: the faulty
       version overwrote its own claim each time, so the value tracked typing
       either way and the spec passed on the bug. What a claimed value actually
       breaks is the next request, so that is what this asks for. */
    const host = (await mount('<helix-input label="Name"></helix-input>')) as HTMLElement & {
      requestValue(next: string): boolean
      updateComplete: Promise<boolean>
      value: string
    }
    await typed(host, 'typed')
    expect(host.value).toBe('typed')

    host.requestValue('set from outside')
    await host.updateComplete
    expect(host.value).toBe('set from outside')
  })

  test('a controlled input keeps its value and puts the control back', async () => {
    /* What React does with the same markup: the value belongs to the consumer,
       so what was typed is undone until they hand back a new one. The native
       control has already moved by the time this runs, which is why putting it
       back is a separate act from not applying the change. */
    const host = (await mount(
      '<helix-input label="Name" value="fixed"></helix-input>',
    )) as HTMLElement & { value: string }
    await typed(host, 'tried')
    expect(host.value).toBe('fixed')
    expect(native(host)).toBe('fixed')
  })

  test('default-value seeds one that owns itself', async () => {
    const host = (await mount(
      '<helix-input default-value="seeded" label="Name"></helix-input>',
    )) as HTMLElement & { value: string }
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(host.value).toBe('seeded')
    await typed(host, 'changed')
    expect(host.value).toBe('changed')
  })
})
