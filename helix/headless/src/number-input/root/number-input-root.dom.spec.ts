import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Field = HTMLElement & {
  stepDown(large?: boolean): void
  stepUp(large?: boolean): void
  updateComplete: Promise<unknown>
  value: string
}

const field = async (attrs = ''): Promise<Field> => {
  const host = (await mount(
    `<helix-headless-number-input label="Guests" ${attrs}></helix-headless-number-input>`,
  )) as Field
  await host.updateComplete
  return host
}

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

const type = async (host: Field, text: string): Promise<void> => {
  const input = control(host)
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input number', () => {
  test('the field is text, so the element can see what was typed', async () => {
    /* Measured against a real browser before this was written: `type=number`
       given "12e" reports `.value === ""`, so a controlled value is destroyed by
       a keystroke and there is nothing left to correct or report. Wheeling over
       a focused one changed 5 to 4, and `selectionStart` is `null`, so the caret
       cannot be managed at all. `inputmode` keeps the phone keypad, which is the
       one thing `type=number` was giving. */
    const host = await field()
    expect(control(host).getAttribute('type')).toBe('text')
    expect(control(host).getAttribute('inputmode')).toBe('decimal')
  })

  test('it announces itself as a number in a range, not a line of text', async () => {
    const host = await field('default-value="4" max="10" min="1"')
    const input = control(host)
    expect(input.getAttribute('role')).toBe('spinbutton')
    expect(input.getAttribute('aria-valuemin')).toBe('1')
    expect(input.getAttribute('aria-valuemax')).toBe('10')
    expect(input.getAttribute('aria-valuenow')).toBe('4')
  })

  test('steps by whole steps', async () => {
    const host = await field('default-value="10" step="5"')
    host.stepUp()
    await host.updateComplete
    expect(host.value).toBe('15')
    host.stepDown()
    host.stepDown()
    await host.updateComplete
    expect(host.value).toBe('5')
  })

  test('a step lands on the grid, anchored at min', async () => {
    // `min="1" step="2"` gives 1, 3, 5 rather than 0, 2, 4.
    const host = await field('default-value="1" min="1" step="2"')
    host.stepUp()
    await host.updateComplete
    expect(host.value).toBe('3')
  })

  test('a fractional step does not leak binary floating point', async () => {
    /* Stepping 0.1 from 0.2 is 0.30000000000000004 in a double, and putting
       that in a field is the kind of thing a reader screenshots. */
    const host = await field('default-value="0.2" step="0.1"')
    host.stepUp()
    await host.updateComplete
    expect(host.value).toBe('0.3')
  })

  test('stepping stops at the bounds', async () => {
    const host = await field('default-value="9" max="10" min="0"')
    host.stepUp()
    host.stepUp()
    host.stepUp()
    await host.updateComplete
    expect(host.value).toBe('10')
  })

  test('the spent stepper is disabled and stays in the row', async () => {
    // A stepper that loses a button at the end of its range changes width, and
    // the field beside it moves with it.
    const host = await field('default-value="0" max="10" min="0"')
    expect((part(host, 'decrement') as HTMLButtonElement).disabled).toBe(true)
    expect((part(host, 'increment') as HTMLButtonElement).disabled).toBe(false)
  })

  test('an empty field steps from min, not from zero', async () => {
    // Stepping to 0 in a field with `min="1"` would be out of range before the
    // reader had typed anything.
    const host = await field('min="1"')
    host.stepUp()
    await host.updateComplete
    expect(host.value).toBe('1')
  })

  test('typing is not clamped, because a reader is mid-number', async () => {
    /* A reader typing "12" is at "1" for one keystroke, and a field with
       `min="10"` that corrected them at that moment could never be typed into. */
    const host = await field('min="10"')
    await type(host, '1')
    expect(host.value).toBe('1')
  })

  test('and leaving the field is where it becomes a number', async () => {
    const host = await field('min="10"')
    await type(host, '1')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(host.value).toBe('10')
  })

  test('a blank field stays blank on the way out', async () => {
    // An empty optional field is a legitimate answer, and filling it with `min`
    // would put a number in a form the reader never gave.
    const host = await field('min="10"')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(host.value).toBe('')
  })

  test('text that is not a number is kept, and marked wrong rather than erased', async () => {
    /* Clearing the field instead leaves a reader who typed "12e" and tabbed
       away looking at nothing, with no word about why, over what is likeliest a
       fat finger on a number they had almost finished. The field is already
       `badInput`, so it shows as wrong and the form refuses it: destroying the
       evidence of a mistake is not the same as preventing one. */
    const host = await field()
    await type(host, '12e')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(host.value).toBe('12e')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.badInput).toBe(true)
  })
})

describe('input number keyboard', () => {
  const press = async (host: Field, key: string): Promise<void> => {
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    )
    await host.updateComplete
  }

  test('the arrows step, and page steps ten', async () => {
    const host = await field('default-value="20"')
    await press(host, 'ArrowUp')
    expect(host.value).toBe('21')
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(host.value).toBe('19')
    await press(host, 'PageUp')
    expect(host.value).toBe('29')
  })

  /* A step is written by script, so the field's own `change`, which comes on
     blur for what was typed, never arrives for one. Found running the events
     example: three presses of the plus reached a `change` listener as nothing. */
  test('a step commits, however it was taken', async () => {
    const host = await field('default-value="5" max="99"')
    let committed = 0
    host.addEventListener('change', () => {
      committed += 1
    })
    await press(host, 'ArrowUp')
    ;(part(host, 'increment') as HTMLElement).click()
    await host.updateComplete
    await press(host, 'End')
    expect(host.value).toBe('99')
    expect(committed).toBe(3)
  })

  test('and one that moved nothing, or was refused, commits nothing', async () => {
    const host = await field('default-value="99" max="99"')
    let committed = 0
    host.addEventListener('change', () => {
      committed += 1
    })
    await press(host, 'ArrowUp')
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    await press(host, 'ArrowDown')
    expect(host.value).toBe('99')
    expect(committed).toBe(0)
  })

  test('Home and End go to the bounds', async () => {
    const host = await field('default-value="5" max="99" min="1"')
    await press(host, 'End')
    expect(host.value).toBe('99')
    await press(host, 'Home')
    expect(host.value).toBe('1')
  })

  test('and are left to the text field where there is no bound to go to', async () => {
    // Without one they are the field's own keys, and moving the caret to the
    // start of the number is what a reader pressing them meant.
    const host = await field('default-value="5"')
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Home' })
    control(host).dispatchEvent(event)
    await host.updateComplete
    expect(event.defaultPrevented).toBe(false)
    expect(host.value).toBe('5')
  })

  test('the arrows are taken, or they scroll the page instead', async () => {
    const host = await field('default-value="5"')
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowUp' })
    control(host).dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('a read-only field reads its value and refuses to move', async () => {
    const host = await field('default-value="5" readonly')
    await press(host, 'ArrowUp')
    expect(host.value).toBe('5')
  })
})

describe('input number validity', () => {
  test('a read-only field is not missing, however empty and however required', async () => {
    /* The platform exempts a read-only control from validation, and the
       reader could not fill this one, so a form holding it could never send. */
    const host = await field('readonly required')
    expect(
      (host as unknown as { internals: ElementInternals }).internals.validity.valueMissing,
    ).not.toBe(true)
  })

  test('reports its value to the form', async () => {
    const host = await field('default-value="7" name="guests"')
    expect(formValue(host)).toBe('7')
  })

  test('a value under the floor is a range underflow, in the platform’s words', async () => {
    /* Computed here rather than copied off the field, which is the one place
       this differs from `Input`: the field is text, so the browser has no
       opinion about whether it is a number in range. A consumer reading
       `validity.rangeUnderflow` still finds what they expect. */
    const host = await field('min="10"')
    await type(host, '4')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.rangeUnderflow).toBe(true)
  })

  test('a value over the ceiling is a range overflow', async () => {
    const host = await field('max="10"')
    await type(host, '40')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.rangeOverflow).toBe(true)
  })

  test('text that is not a number is bad input', async () => {
    const host = await field()
    await type(host, 'abc')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.badInput).toBe(true)
  })

  test('and a number in range is valid', async () => {
    const host = await field('max="10" min="1"')
    await type(host, '5')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.valid).toBe(true)
  })
})

describe('number input scrub', () => {
  const drag = async (host: HTMLElement, dx: number, keys: Partial<PointerEventInit> = {}) => {
    const grip = part(host, 'label') as HTMLElement
    /* happy-dom has no pointer capture, so the handlers' own guard would refuse
       every move. Stubbed to the two answers the component asks for, which is
       the smallest thing that lets the arithmetic be tested at all; whether a
       real capture holds through a drag is a browser question and is asked in
       the geometry block. */
    let held = false
    grip.setPointerCapture = () => {
      held = true
    }
    grip.hasPointerCapture = () => held
    grip.releasePointerCapture = () => {
      held = false
    }
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, pointerId: 1 }))
    grip.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: dx, pointerId: 1, ...keys }),
    )
    grip.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: dx, pointerId: 1 }))
    await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
  }

  const scrubField = async (attrs: string) =>
    mount(`<helix-headless-number-input label="N" scrub ${attrs}></helix-headless-number-input>`)

  test('a label without `scrub` does not move the value', async () => {
    /* The part is there either way, because every field has a label. What
       `scrub` decides is whether a press on it does anything, so this asks the
       value rather than asking whether an element exists. */
    const host = await mount(
      '<helix-headless-number-input label="N" default-value="10"></helix-headless-number-input>',
    )
    await drag(host, 40)
    expect((host as HTMLElement & { value: string }).value).toBe('10')
  })

  test('four pixels is one step', async () => {
    const host = await scrubField('default-value="10" step="1"')
    await drag(host, 12)
    expect((host as HTMLElement & { value: string }).value).toBe('13')
  })

  test('dragging back goes down', async () => {
    const host = await scrubField('default-value="10" step="1"')
    await drag(host, -20)
    expect((host as HTMLElement & { value: string }).value).toBe('5')
  })

  test('shift takes the large step', async () => {
    const host = await scrubField('default-value="0" step="1" large-step="10"')
    await drag(host, 8, { shiftKey: true })
    expect((host as HTMLElement & { value: string }).value).toBe('20')
  })

  test('alt keeps the step and lengthens the travel', async () => {
    /* The same 16 pixels: four steps at the normal pitch, one when fine. Fine
       must never reach a value between the steps, or the drag could produce a
       number the arrow keys cannot. */
    const host = await scrubField('default-value="0" step="1"')
    await drag(host, 16, { altKey: true })
    expect((host as HTMLElement & { value: string }).value).toBe('1')
  })

  test('lands on the step, never between it', async () => {
    const host = await scrubField('default-value="0" step="0.25"')
    await drag(host, 10)
    expect((host as HTMLElement & { value: string }).value).toBe('0.75')
  })

  test('stops at max and at min', async () => {
    const up = await scrubField('default-value="8" step="1" min="0" max="10"')
    await drag(up, 400)
    const down = await scrubField('default-value="2" step="1" min="0" max="10"')
    await drag(down, -400)
    expect([
      (up as HTMLElement & { value: string }).value,
      (down as HTMLElement & { value: string }).value,
    ]).toEqual(['10', '0'])
  })

  test('a read-only field does not move', async () => {
    const host = await scrubField('default-value="10" step="1" readonly')
    await drag(host, 40)
    expect((host as HTMLElement & { value: string }).value).toBe('10')
  })
})

describe("input number in the page's words", () => {
  test('the sentences the bubble raises are properties, with the bound filled in', async () => {
    /* `feedback` replaces the message under the field and never reached the
       browser's own bubble, which a form in another language raised in English. */
    const low = await field('default-value="1" min="2" range-underflow-message="Au moins {min}."')
    expect((low as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      'Au moins 2.',
    )
    const empty = await field('required value-missing-message="Obligatoire."')
    expect((empty as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      'Obligatoire.',
    )
  })
})

describe('Enter in the field', () => {
  /* The `<input>` is in a shadow root and has no form owner, so the platform
     never ran implicit submission for it. */
  test('submits a form with no button and no other field', async () => {
    document.body.innerHTML =
      '<form><helix-headless-number-input name="n" label="Guests"></helix-headless-number-input></form>'
    const host = document.querySelector('helix-headless-number-input') as Field
    await host.updateComplete
    let submitted = 0
    document.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted += 1
    })
    control(host).dispatchEvent(
      new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' }),
    )
    expect(submitted).toBe(1)
  })
})

describe('leaving a number out of range', () => {
  /* The field's `change` arrives before its `blur`, so it was relayed with the
     number as typed and the clamp after it sent `input` alone: a consumer
     saving on `change` kept 150 while the form submitted 100. */
  test('announces change with the clamped number', async () => {
    const host = await field('max="100"')
    await type(host, '150')
    const heard: string[] = []
    host.addEventListener('input', () => heard.push(`input:${host.value}`))
    host.addEventListener('change', () => heard.push(`change:${host.value}`))
    control(host).dispatchEvent(new Event('change'))
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(heard).toEqual(['input:100', 'change:100'])
  })
})

describe('a number in a locale that writes a decimal comma', () => {
  /* The decimal keypad on a phone in such a locale types a comma, and the
     field read `1,5` as not a number and blocked the form. */
  test('is read as a decimal', async () => {
    const host = await field('locale="de-DE" step="0.1"')
    await type(host, '1,5')
    expect(control(host).getAttribute('aria-valuenow')).toBe('1.5')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(host.value).toBe('1.5')
    expect(formValue(host)).toBe('1.5')
  })

  test('and stays not a number where the locale groups with a comma', async () => {
    const host = await field('locale="en-US" step="0.1"')
    await type(host, '1,5')
    expect(control(host).hasAttribute('aria-valuenow')).toBe(false)
  })
})

describe('a number off the step grid', () => {
  /* The description promised `step` reaches validity, and a value written off
     the grid submitted unchanged. */
  test('is invalid, as in a native number field', async () => {
    const host = (await field('step="1" default-value="1.5"')) as Field & {
      validity: ValidityState
      validationMessage: string
    }
    expect(host.validity.stepMismatch).toBe(true)
    expect(host.validationMessage).toBe(
      'Please enter a valid value. The two nearest valid values are 1 and 2.',
    )
  })

  test('counted from min', async () => {
    const host = (await field('min="1" step="2" default-value="3"')) as Field & {
      validity: ValidityState
    }
    expect(host.validity.valid).toBe(true)
  })
})

describe('what a screen reader says for the value', () => {
  test('carries the unit a consumer wrote for it', async () => {
    const host = await field('default-value="4" value-text="{value} kilograms"')
    expect(control(host).getAttribute('aria-valuetext')).toBe('4 kilograms')
  })

  test('and nothing beyond the number by default', async () => {
    const host = await field('default-value="4"')
    expect(control(host).hasAttribute('aria-valuetext')).toBe(false)
  })
})

describe('a formatted number', () => {
  /* React Aria's NumberField formatOptions: the field shows the currency and
     reads one typed back, and the value stays the number. */
  test('shows its format until it is edited, and the number while it is', async () => {
    const host = await field(
      `locale="en-US" value="1200" format-options='{"style":"currency","currency":"USD"}'`,
    )
    expect(control(host).value).toBe('$1,200.00')
    expect(control(host).getAttribute('aria-valuetext')).toBe('$1,200.00')
    control(host).dispatchEvent(new Event('focus'))
    await host.updateComplete
    expect(control(host).value).toBe('1200')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(control(host).value).toBe('$1,200.00')
    expect(formValue(host)).toBe('1200')
  })

  test('reads a typed currency and grouped thousands back to the number', async () => {
    const host = await field(
      `locale="en-US" step="0.01" format-options='{"style":"currency","currency":"USD"}'`,
    )
    await type(host, '$1,250.50')
    control(host).dispatchEvent(new Event('blur'))
    await host.updateComplete
    expect(host.value).toBe('1250.5')
    const plain = await field('locale="en-US"')
    await type(plain, '1,234')
    expect(control(plain).getAttribute('aria-valuenow')).toBe('1234')
  })
})

describe('the wheel', () => {
  /* React Aria steps on the wheel unless isWheelDisabled. Here it is asked
     for, since a reader scrolling past a form should scroll the page. */
  const wheel = (host: Field, deltaY: number): WheelEvent => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY })
    control(host).dispatchEvent(event)
    return event
  }

  test('steps a focused field only where asked', async () => {
    const quiet = await field('value="5"')
    control(quiet).dispatchEvent(new Event('focus'))
    await quiet.updateComplete
    expect(wheel(quiet, -100).defaultPrevented).toBe(false)
    expect(quiet.value).toBe('5')
    const asked = await field('value="5" wheel')
    wheel(asked, -100)
    expect(asked.value).toBe('5')
    control(asked).dispatchEvent(new Event('focus'))
    await asked.updateComplete
    expect(wheel(asked, -100).defaultPrevented).toBe(true)
    expect(asked.value).toBe('6')
    wheel(asked, 100)
    expect(asked.value).toBe('5')
  })
})

describe('on iOS and iPadOS', () => {
  /* VoiceOver reads a spinbutton text field as a slider a reader cannot type
     in, so React Aria drops the role there. It writes no role description on
     iOS either, so VoiceOver says the field is required. */
  test('the field is a plain text field, with no spinbutton role and no role description', async () => {
    const agent = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    })
    try {
      const host = await field()
      expect(control(host).hasAttribute('role')).toBe(false)
      expect(control(host).hasAttribute('aria-roledescription')).toBe(false)
    } finally {
      if (agent) {
        Object.defineProperty(navigator, 'userAgent', agent)
      } else {
        delete (navigator as unknown as Record<string, unknown>).userAgent
      }
    }
    expect(control(await field()).getAttribute('role')).toBe('spinbutton')
  })
})
