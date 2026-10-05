import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

const cells = (host: HTMLElement): HTMLInputElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLInputElement>('[part="cell"]') ?? []),
]

/**
 * A reader entering the row and typing into a box, which is what arrives in one
 * whether it was typed, pasted, or filled by the browser.
 *
 * **The `focusin` is not decoration.** The component takes its commit baseline
 * when focus arrives from outside the row, so a helper that types without
 * arriving leaves the component's own focus move (it advances a box per
 * character) as the first `focusin` it ever sees, and the baseline lands on the
 * text that was just typed. That is not what a browser does, where the reader's
 * click or tab is the first one.
 */
const arrive = async (host: Pin, at: number, text: string): Promise<void> => {
  const cell = cells(host)[at] as HTMLInputElement
  cell.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
  cell.value = text
  cell.dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
  await host.updateComplete
}

/** What a paste or an autofill drops into one box. */
const paste = async (host: Pin, at: number, text: string): Promise<void> => {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
  cells(host)[at]?.dispatchEvent(event)
  await host.updateComplete
  await host.updateComplete
}

describe('input pin', () => {
  test('one box per character', async () => {
    const host = await pin('length="4"')
    expect(cells(host)).toHaveLength(4)
  })

  test('the code is one value to the form, not six', async () => {
    // The boxes are inside a shadow root and submit nothing on their own.
    const host = await pin('default-value="1234" length="4" name="code"')
    expect(formValue(host)).toBe('1234')
  })

  test('typing fills the box and moves on', async () => {
    const host = await pin('length="4"')
    await arrive(host, 0, '7')
    expect(host.value).toBe('7')
    expect(cells(host)[0]?.value).toBe('7')
  })

  test('a paste into an empty field fills from the start, wherever it landed', async () => {
    /* A code has no holes in it. Writing from box three of an empty field puts
       "4321" in the value and draws it in boxes one to four, so the boxes and
       the value disagree about where the reader typed. Pasting a code while the
       caret happens to sit in the middle means "fill this in", which is what
       clamping to the end of what is there gives. */
    const host = await pin('length="6"')
    await paste(host, 2, '4321')
    expect(host.value).toBe('4321')
    expect(cells(host).map((one) => one.value)).toEqual(['4', '3', '2', '1', '', ''])
  })

  test('and into a part-filled one carries on from the end', async () => {
    const host = await pin('default-value="12" length="6"')
    await paste(host, 2, '99')
    expect(host.value).toBe('1299')
  })

  test('and so does an autofill, which lands as one long input', async () => {
    /* A browser filling an SMS code drops the whole thing into whichever box is
       focused, and so does a password manager. A per-cell `maxlength` would have
       truncated it to the first character and lost the rest, silently. */
    const host = await pin('length="6"')
    await arrive(host, 0, '135790')
    expect(cells(host).map((one) => one.value)).toEqual(['1', '3', '5', '7', '9', '0'])
    expect(host.value).toBe('135790')
  })

  test('a numeric code refuses anything that is not a digit', async () => {
    // Letting a letter into a box a reader cannot submit is a mistake they have
    // to find and undo themselves.
    const host = await pin('length="4"')
    await arrive(host, 0, 'a1b2')
    expect(host.value).toBe('12')
  })

  test('and `text` takes them', async () => {
    const host = await pin('length="4" type="text"')
    await arrive(host, 0, 'a1b2')
    expect(host.value).toBe('a1b2')
  })

  test('`alphanumeric` takes letters and digits and refuses the rest', async () => {
    /* The mode between the other two: `numeric` drops a letter, `text` keeps a
       hyphen, and a code that is letters and digits wants neither. */
    const host = await pin('length="6" type="alphanumeric"')
    await arrive(host, 0, 'a1-b2!')
    expect(host.value).toBe('a1b2')
  })

  test('`alphanumeric` is ASCII, and `text` is where a marked letter goes', async () => {
    /* Narrower than the word is in general, and deliberately: a code off a
       keypad, an SMS or an authenticator does not carry `é`, so accepting one
       admits a character the service on the other end will reject. */
    const strict = await pin('length="4" type="alphanumeric"')
    await arrive(strict, 0, 'éa9')
    expect(strict.value).toBe('a9')

    const loose = await pin('length="4" type="text"')
    await arrive(loose, 0, 'éa9')
    expect(loose.value).toBe('éa9')
  })

  test('anything past the last box is dropped rather than wrapping', async () => {
    const host = await pin('length="4"')
    await arrive(host, 0, '123456789')
    expect(host.value).toBe('1234')
  })

  test('the first box asks for the code, and only the first', async () => {
    // It is a hint about the field as a whole, and repeating it offers a browser
    // six places to put one code.
    const host = await pin('length="4"')
    const hints = cells(host).map((one) => one.getAttribute('autocomplete'))
    expect(hints).toEqual(['one-time-code', 'off', 'off', 'off'])
  })

  test('every box says which one it is', async () => {
    const host = await pin('length="3"')
    expect(cells(host).map((one) => one.getAttribute('aria-label'))).toEqual([
      'Character 1 of 3',
      'Character 2 of 3',
      'Character 3 of 3',
    ])
  })

  test('masking makes them password boxes', async () => {
    const host = await pin('length="4" mask')
    expect(cells(host).map((one) => one.getAttribute('type'))).toEqual([
      'password',
      'password',
      'password',
      'password',
    ])
  })

  test('clearing empties every box', async () => {
    const host = await pin('default-value="1234" length="4"')
    host.clear()
    await host.updateComplete
    await host.updateComplete
    expect(host.value).toBe('')
    expect(cells(host).every((one) => one.value === '')).toBe(true)
  })
})

describe('input pin deletion', () => {
  test('emptying a box removes that character and the rest close up', async () => {
    /* A Backspace in a *filled* box is the browser's own: the keydown handler
       leaves it alone, the character goes, and `input` arrives carrying "". A
       write path that returns early on empty lets the repaint put the character
       straight back, so Backspace on a full code does nothing at all. */
    const host = await pin('default-value="123456"')
    await arrive(host, 2, '')
    expect(host.value).toBe('12456')
    expect(cells(host).map((one) => one.value)).toEqual(['1', '2', '4', '5', '6', ''])
  })

  test('emptying the last box just shortens it', async () => {
    const host = await pin('default-value="123456"')
    await arrive(host, 5, '')
    expect(host.value).toBe('12345')
  })

  test('and a code can be emptied one box at a time', async () => {
    const host = await pin('default-value="12"')
    await arrive(host, 1, '')
    await arrive(host, 0, '')
    expect(host.value).toBe('')
  })
})

describe('input pin keyboard', () => {
  const press = async (host: Pin, at: number, key: string): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    cells(host)[at]?.dispatchEvent(event)
    await host.updateComplete
    await host.updateComplete
    return event
  }

  test('Backspace in an empty box goes back and clears the one it lands in', async () => {
    // What makes a code correctable without the reader hunting for the box they
    // meant.
    const host = await pin('default-value="123" length="4"')
    await press(host, 3, 'Backspace')
    expect(host.value).toBe('12')
  })

  test('and in a full box does what it always does', async () => {
    const host = await pin('default-value="123" length="4"')
    const event = await press(host, 2, 'Backspace')
    expect(event.defaultPrevented).toBe(false)
    expect(host.value).toBe('123')
  })

  test('the arrows move between boxes and are taken', async () => {
    const host = await pin('length="4"')
    const event = await press(host, 1, 'ArrowLeft')
    expect(event.defaultPrevented).toBe(true)
    expect(host.shadowRoot?.activeElement).toBe(cells(host)[0] as HTMLInputElement)
  })

  /* A code reads left to right on every page, the way a phone number does, so
     the row keeps its order on a right-to-left page and the right arrow still
     moves on. It ran from the right there, with the left arrow moving on. */
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
      const host = await pin('length="4"')
      await press(host, 1, 'ArrowRight')
      expect(host.shadowRoot?.activeElement).toBe(cells(host)[2] as HTMLInputElement)
      await press(host, 2, 'ArrowLeft')
      expect(host.shadowRoot?.activeElement).toBe(cells(host)[1] as HTMLInputElement)
    })

    /* Where the boxes are, which needs a browser: happy-dom lays nothing out. */
    const laid = hasLayout() ? test : (): void => {}
    const left = (cell: HTMLInputElement | undefined): number =>
      cell?.getBoundingClientRect().left ?? Number.NaN

    laid('the first character typed is in the leftmost box', async () => {
      document.documentElement.dir = 'rtl'
      const host = await pin('length="4"')
      await arrive(host, 0, '7')
      const boxes = cells(host)
      const leftmost = [...boxes].sort((a, b) => left(a) - left(b))[0]
      expect(leftmost?.value).toBe('7')
      expect(left(boxes[0])).toBeLessThan(left(boxes[1]))
    })

    laid('a paste fills from the left, a character a box', async () => {
      document.documentElement.dir = 'rtl'
      const host = await pin('length="4"')
      await paste(host, 0, '4821')
      const boxes = [...cells(host)].sort((a, b) => left(a) - left(b))
      expect(boxes.map((one) => one.value)).toEqual(['4', '8', '2', '1'])
    })
  })

  test('a read-only field refuses to move', async () => {
    const host = await pin('default-value="123" length="4" readonly')
    await press(host, 3, 'Backspace')
    expect(host.value).toBe('123')
  })
})

describe('input pin completion', () => {
  test('says so when the last box is filled', async () => {
    /* The moment a code entry exists for: a consumer watching `helix-change`
       would have to know the length and compare it on every keystroke. */
    const host = await pin('length="4"')
    let completed = ''
    host.addEventListener('helix-complete', (event) => {
      completed = (event as CustomEvent<{ value: string }>).detail.value
    })
    await arrive(host, 0, '9876')
    expect(completed).toBe('9876')
  })

  test('and not before', async () => {
    const host = await pin('length="4"')
    let fired = false
    host.addEventListener('helix-complete', () => {
      fired = true
    })
    await arrive(host, 0, '987')
    expect(fired).toBe(false)
  })
})

describe('input pin commit', () => {
  /** Leaving a box, for wherever focus is going. */
  const leave = (host: Pin, at: number, to: HTMLElement | null = null): void => {
    cells(host)[at]?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }))
  }

  const commits = (host: Pin): string[] => {
    const seen: string[] = []
    host.addEventListener('change', () => {
      seen.push(host.value)
    })
    return seen
  }

  /** Focus arriving from outside, which is what takes the baseline. */
  const enter = (host: Pin, at = 0): void => {
    cells(host)[at]?.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: null }),
    )
  }

  test('a value the consumer assigned is not announced as one the reader entered', async () => {
    /* Measured in Chromium against a native input: a script assigns while the
       field is unfocused, the reader visits and edits nothing, and native stays
       silent. `change` on a field is read by `MixinField` as "the reader has had
       a go at this", so announcing here would tell a consumer their own
       assignment was the reader's answer. */
    const host = await pin('length="4"')
    const seen = commits(host)
    host.value = '1234'
    await host.updateComplete
    enter(host)
    leave(host, 0)
    expect(seen).toEqual([])
  })

  test('and editing after that assignment does commit, carrying the whole code', async () => {
    const host = await pin('length="4"')
    const seen = commits(host)
    host.value = '12'
    await host.updateComplete
    await arrive(host, 2, '3')
    leave(host, 2)
    expect(seen).toEqual(['123'])
  })

  test('an edited code commits when focus leaves the row', async () => {
    const host = await pin('length="4"')
    const seen = commits(host)
    await arrive(host, 0, '12')
    leave(host, 2)
    expect(seen).toEqual(['12'])
  })

  test('and moving from one box to the next is not leaving', async () => {
    /* Every character moves focus along, so a per-cell blur would commit on
       every keystroke. */
    const host = await pin('length="4"')
    const seen = commits(host)
    await arrive(host, 0, '12')
    leave(host, 2, cells(host)[3] as HTMLElement)
    expect(seen).toEqual([])
  })

  test('and leaving without having edited says nothing', async () => {
    const host = await pin('default-value="12" length="4"')
    const seen = commits(host)
    leave(host, 0)
    expect(seen).toEqual([])
  })

  test('a filled code commits once, and leaving it does not commit again', async () => {
    const host = await pin('length="4"')
    const seen = commits(host)
    await arrive(host, 0, '1234')
    leave(host, 3)
    expect(seen).toEqual(['1234'])
  })

  test('so a half-entered code says what is wrong with it once it is left', async () => {
    /* The whole point of the commit: `MixinField` shows nothing until the
       reader has had a go, and completion alone counting as one leaves a code
       abandoned at two of four answered with silence. */
    const host = await pin('length="4"')
    await arrive(host, 0, '12')
    expect(part(host, 'feedback')).toBeNull()
    leave(host, 2)
    await host.updateComplete
    await host.updateComplete
    expect(part(host, 'feedback')?.textContent?.trim()).toBe('Please enter all 4 characters.')
  })
})

describe('input pin validity', () => {
  const internals = (host: HTMLElement): ElementInternals =>
    (host as unknown as { internals: ElementInternals }).internals

  test('a half-entered code is too short, in the platform’s words', async () => {
    const host = await pin('length="6"')
    await arrive(host, 0, '123')
    expect(internals(host).validity.tooShort).toBe(true)
  })

  test('a required code that is empty is missing', async () => {
    const host = await pin('length="4" required')
    expect(internals(host).validity.valueMissing).toBe(true)
  })

  test('and a full one is valid', async () => {
    const host = await pin('length="4" required')
    await arrive(host, 0, '1234')
    expect(internals(host).validity.valid).toBe(true)
  })

  test('the message points at a box, not at the host', async () => {
    // Without the anchor the validity bubble points at a wrapper with no text
    // in it. Same reason `Input` passes its control.
    const host = await pin('length="4" required')
    expect(part(host, 'cell')).not.toBeNull()
    expect(internals(host).validationMessage).not.toBe('')
  })
})

describe('the row of cells', () => {
  test('is named by the label, resolved in its own tree', async () => {
    /* The row is a group of its own inside the template, and it had no name:
       each cell said "Character 1 of 6" and nothing said of what. */
    const host = await pin()
    const row = host.shadowRoot?.querySelector('[part="field"]')
    const named = row?.getAttribute('aria-labelledby') ?? ''
    const scope = row?.getRootNode() as ShadowRoot
    expect(scope.getElementById(named)?.textContent?.trim()).toBe('Code')
  })
})

describe('Enter in a box', () => {
  /* Each box is in a shadow root and has no form owner, so the platform never
     ran implicit submission for one. */
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
    cells(host)[0]?.dispatchEvent(
      new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' }),
    )
    expect(submitted).toBe(1)
  })
})
