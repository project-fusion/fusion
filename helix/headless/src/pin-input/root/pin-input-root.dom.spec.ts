import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Pin = HTMLElement & { clear(): void; updateComplete: Promise<unknown>; value: string }

const pin = async (attrs = ''): Promise<Pin> => {
  const host = (await mount(
    `<helix-headless-pin-input label="Code" ${attrs}></helix-headless-pin-input>`,
  )) as Pin
  await host.updateComplete
  return host
}

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

const cells = (host: HTMLElement): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="cell"]') ?? []),
]

/** What each box draws, in order. */
const boxes = (host: HTMLElement): string[] =>
  cells(host).map((cell) => cell.textContent?.trim() ?? '')

/** The box the caret is drawn in, or -1. */
const activeBox = (host: HTMLElement): number =>
  cells(host).findIndex((cell) => (cell.getAttribute('part') ?? '').includes('cell-active'))

const settle = async (host: Pin): Promise<void> => {
  await host.updateComplete
  await host.updateComplete
}

/** Focus arriving in the field, which takes the commit baseline and draws the caret. */
const arrive = async (host: Pin): Promise<void> => {
  control(host).dispatchEvent(new FocusEvent('focus'))
  await settle(host)
}

/**
 * What the platform leaves in the one field after a keystroke, an autofill or
 * a deletion: its text and the caret, then `input`.
 */
const edit = async (host: Pin, text: string, caret = text.length): Promise<void> => {
  const field = control(host)
  field.value = text
  field.setSelectionRange(caret, caret)
  field.dispatchEvent(new Event('input', { bubbles: true }))
  await settle(host)
}

/** A paste, over the field's selection. */
const paste = async (host: Pin, text: string): Promise<ClipboardEvent> => {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
  control(host).dispatchEvent(event)
  await settle(host)
  return event
}

const press = async (host: Pin, key: string): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  control(host).dispatchEvent(event)
  await settle(host)
  return event
}

describe('input pin', () => {
  test('one box per character, drawn from one field', async () => {
    const host = await pin('length="4"')
    expect(cells(host)).toHaveLength(4)
    expect(host.shadowRoot?.querySelectorAll('input')).toHaveLength(1)
  })

  /* Web Awesome keeps one real input and draws the boxes over it, so a screen
     reader meets one field and the code never sits in six. */
  test('the boxes are hidden from a screen reader, and the field is named by the label', async () => {
    const host = await pin('length="4"')
    expect(cells(host).every((cell) => cell.getAttribute('aria-hidden') === 'true')).toBe(true)
    const label = part(host, 'label')
    expect(label?.localName).toBe('label')
    expect(label?.getAttribute('for')).toBe(control(host).id)
    expect(part(host, 'field')?.hasAttribute('role')).toBe(false)
  })

  test('the code is one value to the form', async () => {
    const host = await pin('default-value="1234" length="4" name="code"')
    expect(formValue(host)).toBe('1234')
    expect(control(host).hasAttribute('name')).toBe(false)
  })

  test('typing fills the box and moves on', async () => {
    const host = await pin('length="4"')
    await arrive(host)
    await edit(host, '7')
    expect(host.value).toBe('7')
    expect(boxes(host)).toEqual(['7', '', '', ''])
    expect(activeBox(host)).toBe(1)
  })

  test('a filled box selects its character, so typing replaces it', async () => {
    const host = await pin('length="4" default-value="123"')
    await arrive(host)
    await press(host, 'Home')
    expect([control(host).selectionStart, control(host).selectionEnd]).toEqual([0, 1])
    await edit(host, '923', 1)
    expect(host.value).toBe('923')
    expect(activeBox(host)).toBe(1)
    expect([control(host).selectionStart, control(host).selectionEnd]).toEqual([1, 2])
  })

  test('a paste into an empty field fills from the start', async () => {
    const host = await pin('length="6"')
    await arrive(host)
    await paste(host, '4321')
    expect(host.value).toBe('4321')
    expect(boxes(host)).toEqual(['4', '3', '2', '1', '', ''])
  })

  test('and over a filled box replaces from there, leaving the rest', async () => {
    const host = await pin('default-value="123456" length="6"')
    await arrive(host)
    control(host).setSelectionRange(2, 3)
    await paste(host, '99')
    expect(host.value).toBe('129956')
  })

  test('and over a wider selection replaces it', async () => {
    const host = await pin('default-value="123456" length="6"')
    await arrive(host)
    control(host).setSelectionRange(0, 6)
    await paste(host, '78')
    expect(host.value).toBe('78')
  })

  test('an autofill lands as one long input and fills every box', async () => {
    const host = await pin('length="6"')
    await arrive(host)
    await edit(host, '135790')
    expect(boxes(host)).toEqual(['1', '3', '5', '7', '9', '0'])
    expect(host.value).toBe('135790')
  })

  test('a numeric code refuses anything that is not a digit', async () => {
    const host = await pin('length="4"')
    await edit(host, 'a1b2')
    expect(host.value).toBe('12')
    expect(control(host).value).toBe('12')
  })

  test('and `text` takes them', async () => {
    const host = await pin('length="4" type="text"')
    await edit(host, 'a1b2')
    expect(host.value).toBe('a1b2')
  })

  test('`alphanumeric` takes ASCII letters and digits and refuses the rest', async () => {
    const strict = await pin('length="6" type="alphanumeric"')
    await edit(strict, 'éa1-b2!')
    expect(strict.value).toBe('a1b2')
    const loose = await pin('length="4" type="text"')
    await edit(loose, 'éa9')
    expect(loose.value).toBe('éa9')
  })

  test('anything past the last box is dropped rather than wrapping', async () => {
    const host = await pin('length="4"')
    await edit(host, '123456789')
    expect(host.value).toBe('1234')
  })

  test('the field asks for the code and offers the keyboard its type wants', async () => {
    const host = await pin('length="4"')
    expect(control(host).getAttribute('autocomplete')).toBe('one-time-code')
    expect(control(host).getAttribute('inputmode')).toBe('numeric')
    const text = await pin('type="text"')
    expect(control(text).getAttribute('inputmode')).toBe('text')
  })

  /* Web Awesome draws `--mask-char` in place of a masked character, so the code
     is never drawn as text. */
  test('masking makes it a password field and draws the mask character in each filled box', async () => {
    const host = await pin('length="4" mask default-value="12"')
    expect(control(host).getAttribute('type')).toBe('password')
    expect(boxes(host)).toEqual(['•', '•', '', ''])
    const starred = await pin('length="4" mask mask-character="*" default-value="12"')
    expect(boxes(starred)).toEqual(['*', '*', '', ''])
  })

  test('an empty box draws the placeholder, except the one the caret is in', async () => {
    const host = await pin('length="3" placeholder="0"')
    expect(host.shadowRoot?.querySelectorAll('[part="placeholder"]')).toHaveLength(3)
    await arrive(host)
    expect(host.shadowRoot?.querySelectorAll('[part="placeholder"]')).toHaveLength(2)
    expect(cells(host)[0]?.querySelector('[part="caret"]')).not.toBeNull()
  })

  test('clearing empties every box', async () => {
    const host = await pin('default-value="1234" length="4"')
    host.clear()
    await settle(host)
    expect(host.value).toBe('')
    expect(boxes(host)).toEqual(['', '', '', ''])
  })
})

describe('input pin deletion', () => {
  /* The field's own Backspace and Delete: a filled box's character is selected,
     so either removes it and the rest close up, and the empty place after the
     code makes Backspace remove the one before. */
  test('removing a box’s character closes the rest up, and the caret stays', async () => {
    const host = await pin('default-value="123456"')
    await arrive(host)
    await edit(host, '12456', 2)
    expect(host.value).toBe('12456')
    expect(boxes(host)).toEqual(['1', '2', '4', '5', '6', ''])
    expect(activeBox(host)).toBe(2)
  })

  test('Backspace after the code removes the last character and moves back', async () => {
    const host = await pin('default-value="123" length="4"')
    await arrive(host)
    expect(activeBox(host)).toBe(3)
    await edit(host, '12', 2)
    expect(host.value).toBe('12')
    expect(activeBox(host)).toBe(2)
  })

  test('Backspace and Delete are the field’s own, and not taken', async () => {
    const host = await pin('default-value="123" length="4"')
    await arrive(host)
    expect((await press(host, 'Backspace')).defaultPrevented).toBe(false)
    expect((await press(host, 'Delete')).defaultPrevented).toBe(false)
  })
})

describe('input pin keyboard', () => {
  test('the arrows move between boxes and are taken', async () => {
    const host = await pin('length="4" default-value="12"')
    await arrive(host)
    expect(activeBox(host)).toBe(2)
    const event = await press(host, 'ArrowLeft')
    expect(event.defaultPrevented).toBe(true)
    expect(activeBox(host)).toBe(1)
    await press(host, 'ArrowRight')
    await press(host, 'ArrowRight')
    // Never past the end of the code, since a code has no holes in it.
    expect(activeBox(host)).toBe(2)
  })

  test('Home goes to the first box and End to the end of the code', async () => {
    const host = await pin('length="4" default-value="12"')
    await arrive(host)
    await press(host, 'Home')
    expect(activeBox(host)).toBe(0)
    await press(host, 'End')
    expect(activeBox(host)).toBe(2)
  })

  /* A code reads left to right on every page, the way a phone number does, so
     the row keeps its order on a right-to-left page and the right arrow still
     moves on. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('the row is left to right, and the words around it are not', async () => {
      document.documentElement.dir = 'rtl'
      const host = await pin('hint="Sent to your phone" length="4"')
      expect(part(host, 'field')?.getAttribute('dir')).toBe('ltr')
      expect(part(host, 'label')?.hasAttribute('dir')).toBe(false)
      expect(part(host, 'hint')?.hasAttribute('dir')).toBe(false)
    })

    test('the right arrow is the next box and the left the one before', async () => {
      document.documentElement.dir = 'rtl'
      const host = await pin('length="4" default-value="123"')
      await arrive(host)
      await press(host, 'Home')
      await press(host, 'ArrowRight')
      expect(activeBox(host)).toBe(1)
      await press(host, 'ArrowLeft')
      expect(activeBox(host)).toBe(0)
    })

    /* Where the boxes are, which needs a browser: happy-dom lays nothing out. */
    const laid = hasLayout() ? test : (): void => {}
    const left = (cell: HTMLElement | undefined): number =>
      cell?.getBoundingClientRect().left ?? Number.NaN

    laid('a paste fills from the left, a character a box', async () => {
      document.documentElement.dir = 'rtl'
      const host = await pin('length="4"')
      await arrive(host)
      await paste(host, '4821')
      const sorted = [...cells(host)].sort((a, b) => left(a) - left(b))
      expect(sorted.map((one) => one.textContent?.trim())).toEqual(['4', '8', '2', '1'])
    })
  })

  test('a read-only field draws no caret, moves nothing, and keeps Backspace from the page', async () => {
    const host = await pin('default-value="123" length="4" readonly')
    await arrive(host)
    expect(activeBox(host)).toBe(-1)
    expect((await press(host, 'ArrowLeft')).defaultPrevented).toBe(false)
    expect((await press(host, 'Backspace')).defaultPrevented).toBe(true)
    expect(host.value).toBe('123')
  })
})

describe('a press on a box', () => {
  const click = async (host: Pin, at: number): Promise<MouseEvent> => {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true })
    cells(host)[at]?.dispatchEvent(down)
    cells(host)[at]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await settle(host)
    return down
  }

  test('keeps focus in the field, and puts the caret there or after the code', async () => {
    const host = await pin('length="4" default-value="12"')
    const down = await click(host, 0)
    expect(down.defaultPrevented).toBe(true)
    expect(host.shadowRoot?.activeElement).toBe(control(host))
    expect(activeBox(host)).toBe(0)
    await click(host, 3)
    expect(activeBox(host)).toBe(2)
  })
})

describe('input pin completion', () => {
  test('says so when the last box is filled, and not before', async () => {
    const host = await pin('length="4"')
    const completed: string[] = []
    host.addEventListener('helix-complete', (event) => {
      completed.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await edit(host, '987')
    expect(completed).toEqual([])
    await edit(host, '9876')
    expect(completed).toEqual(['9876'])
  })
})

describe('input pin commit', () => {
  const commits = (host: Pin): string[] => {
    const seen: string[] = []
    host.addEventListener('change', () => {
      seen.push(host.value)
    })
    return seen
  }

  const leave = async (host: Pin): Promise<void> => {
    control(host).dispatchEvent(new FocusEvent('blur'))
    await settle(host)
  }

  test('a value the consumer assigned is not announced as one the reader entered', async () => {
    /* Measured in Chromium against a native input: a script assigns while the
       field is unfocused, the reader visits and edits nothing, and native stays
       silent. */
    const host = await pin('length="4"')
    const seen = commits(host)
    host.value = '1234'
    await host.updateComplete
    await arrive(host)
    await leave(host)
    expect(seen).toEqual([])
  })

  test('and editing after that assignment does commit, carrying the whole code', async () => {
    const host = await pin('length="4"')
    const seen = commits(host)
    host.value = '12'
    await host.updateComplete
    await arrive(host)
    await edit(host, '123')
    await leave(host)
    expect(seen).toEqual(['123'])
  })

  test('leaving without having edited says nothing', async () => {
    const host = await pin('default-value="12" length="4"')
    const seen = commits(host)
    await arrive(host)
    await leave(host)
    expect(seen).toEqual([])
  })

  test('a filled code commits once, and leaving it does not commit again', async () => {
    const host = await pin('length="4"')
    const seen = commits(host)
    await arrive(host)
    await edit(host, '1234')
    await leave(host)
    expect(seen).toEqual(['1234'])
  })

  test('so a half-entered code says what is wrong with it once it is left', async () => {
    const host = await pin('length="4"')
    await arrive(host)
    await edit(host, '12')
    expect(part(host, 'feedback')).toBeNull()
    await leave(host)
    expect(part(host, 'feedback')?.textContent?.trim()).toBe('Please enter all 4 characters.')
    expect(control(host).getAttribute('aria-invalid')).toBe('true')
  })
})

describe('input pin validity', () => {
  const internals = (host: HTMLElement): ElementInternals =>
    (host as unknown as { internals: ElementInternals }).internals

  test('a half-entered code is too short, in the platform’s words', async () => {
    const host = await pin('length="6"')
    await edit(host, '123')
    expect(internals(host).validity.tooShort).toBe(true)
  })

  test('a required code that is empty is missing, and the field says it is required', async () => {
    const host = await pin('length="4" required')
    expect(internals(host).validity.valueMissing).toBe(true)
    expect(control(host).getAttribute('aria-required')).toBe('true')
  })

  test('and a full one is valid', async () => {
    const host = await pin('length="4" required')
    await edit(host, '1234')
    expect(internals(host).validity.valid).toBe(true)
  })
})

describe('Enter in the field', () => {
  test('submits a form with no button and no other field', async () => {
    document.body.innerHTML =
      '<form><helix-headless-pin-input name="code" label="Code"></helix-headless-pin-input></form>'
    const host = document.querySelector('helix-headless-pin-input') as Pin
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

describe('a read-only code', () => {
  test('refuses a paste', async () => {
    const host = await pin('length="4" readonly default-value="1234"')
    const event = await paste(host, '9999')
    expect(event.defaultPrevented).toBe(true)
    expect(host.value).toBe('1234')
  })
})

describe('a code completed and refused', () => {
  /* An auto-submit wired to `helix-complete` submitted a code the field did not
     hold, because the event was sent with what was proposed. */
  test('sends no helix-complete for the code it refused, and puts the field back', async () => {
    const host = await pin('length="4"')
    host.addEventListener('helix-before-change', (event) => {
      if ((event as CustomEvent<{ value: string }>).detail.value.length === 4) {
        event.preventDefault()
      }
    })
    const completed: string[] = []
    host.addEventListener('helix-complete', (event) => {
      completed.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await paste(host, '1234')
    expect(completed).toEqual([])
    expect(host.value).toBe('')
    await edit(host, '1234')
    expect(control(host).value).toBe('')
  })

  test('and sends it for a code it took', async () => {
    const host = await pin('length="4"')
    const completed: string[] = []
    host.addEventListener('helix-complete', (event) => {
      completed.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await paste(host, '1234')
    expect(completed).toEqual(['1234'])
  })
})

describe('the gaps Zag and Web Awesome close', () => {
  test('autosubmit submits the form once a code it took fills the last box', async () => {
    document.body.innerHTML =
      '<form><helix-headless-pin-input label="Code" length="4" autosubmit></helix-headless-pin-input></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const host = document.querySelector('helix-headless-pin-input') as Pin
    await host.updateComplete
    let submitted = 0
    form.requestSubmit = () => {
      submitted += 1
    }
    await paste(host, '12')
    expect(submitted).toBe(0)
    await paste(host, '34')
    expect([host.value, submitted]).toEqual(['1234', 1])
  })

  test('format draws its separators between the boxes, hidden from the reader', async () => {
    const host = await pin('length="6" format="###-###"')
    const separators = [...(host.shadowRoot?.querySelectorAll('[part="separator"]') ?? [])]
    expect(separators.map((one) => [one.textContent, one.getAttribute('aria-hidden')])).toEqual([
      ['-', 'true'],
    ])
    expect(separators[0]?.previousElementSibling).toBe(cells(host)[2] as Element)
    expect(part(await pin(), 'separator')).toBeNull()
  })

  test('case writes typed and pasted letters in the case asked for', async () => {
    const host = await pin('length="4" type="alphanumeric" case="upper"')
    await paste(host, 'ab3x')
    expect(host.value).toBe('AB3X')
    const lower = await pin('length="4" type="alphanumeric" case="lower"')
    await edit(lower, 'Q')
    expect(lower.value).toBe('q')
  })

  test('says it is complete once every box holds a character, and marks the filled boxes', async () => {
    const host = await pin('length="4"')
    expect(hasState(host, 'complete')).toBe(false)
    await paste(host, '1234')
    expect(hasState(host, 'complete')).toBe(true)
    expect(cells(host).every((cell) => cell.getAttribute('part')?.includes('cell-filled'))).toBe(
      true,
    )
  })
})
