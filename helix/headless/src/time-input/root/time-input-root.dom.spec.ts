import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputTime = HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }

const field = async (attrs = ''): Promise<InputTime> => {
  const host = (await mount(
    `<helix-headless-time-input label="Starts" ${attrs}></helix-headless-time-input>`,
  )) as InputTime
  await host.updateComplete
  return host
}

const control = (host: InputTime): HTMLInputElement => part(host, 'control') as HTMLInputElement

const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

/* Focus first, because typing into an unfocused field is not a thing that
   happens and the two are not equivalent here: the field renders when idle and
   holds the value while it is being edited. */
const type = async (host: InputTime, text: string): Promise<void> => {
  control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input time', () => {
  test('the list is the real helix-headless-time-picker, not a second one written here', async () => {
    expect(part(await field(), 'picker')?.tagName.toLowerCase()).toBe('helix-headless-time-picker')
  })

  test('the field renders the time idle and holds the value while edited', async () => {
    /* `2:30 PM` cannot be typed back and `Intl` has no parser to make it so, so
       the two are separated in time rather than chosen between. Date Input draws
       the same line. */
    const host = await field('default-value="14:30" locale="en-GB"')
    expect(control(host).value).toBe('14:30')

    const us = await field('default-value="14:30" locale="en-US"')
    expect(control(us).value).toContain('2:30')
    control(us).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await us.updateComplete
    expect(control(us).value).toBe('14:30')
    control(us).dispatchEvent(new FocusEvent('blur'))
    await us.updateComplete
    expect(control(us).value).toContain('2:30')
  })

  test('`iso` holds the value whether or not it is being edited', async () => {
    const host = await field('default-value="14:30" locale="en-US" time-style="iso"')
    expect(control(host).value).toBe('14:30')
  })

  test('typing sets the value, so a reader who knows the time never uses the list', async () => {
    const host = await field()
    await type(host, '09:07')
    expect(host.value).toBe('09:07')
    // And a time the step does not offer is exactly the case the field is for.
    expect(internals(host).validationMessage).toBe('')
  })

  test('a half-typed time is kept but not handed to the list', async () => {
    // `09:` is not a time, and passing it on would clear the selection mid-word.
    const host = await field()
    await type(host, '09:')
    expect(host.value).toBe('09:')
    expect((part(host, 'picker') as unknown as { value: string }).value).toBe('')
  })

  test('bounds are checked, and the message says them the way the reader reads them', async () => {
    const host = await field('locale="en-GB" max="17:00" min="09:00"')
    await type(host, '08:30')
    expect(internals(host).validationMessage).toContain('09:00')
    await type(host, '18:00')
    expect(internals(host).validationMessage).toContain('17:00')
  })

  /* It named a pattern token, "Enter a time as HH:mm.", to a reader whose
     field showed `2:30 PM`. */
  test('something that is not a time says what one looks like, with a time the field reads back', async () => {
    const host = await field('locale="en-US"')
    await type(host, '25:00')
    expect(internals(host).validationMessage).toBe('Enter a time such as 2:30 PM.')
    const german = await field('locale="de-DE" seconds')
    await type(german, 'bald')
    expect(internals(german).validationMessage).toBe('Enter a time such as 14:30:15.')
  })

  /* Tab into a native `<input>` holding text selects it, and typing replaces
     it. Measured in Chromium before this: the caret sat at the end of `14:30`,
     and typing `9am` gave `14:309am`. */
  test('a field that holds a time selects its text when focus arrives', async () => {
    const host = await field('value="14:30" locale="en-US"')
    const input = control(host)
    input.focus()
    await host.updateComplete
    await host.updateComplete
    expect(input.value).toBe('14:30')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5])
  })

  test('an empty field is not invalid, it is empty', async () => {
    expect(internals(await field()).validationMessage).toBe('')
  })

  test('picking a time takes it and shuts the list', async () => {
    // One time has nothing more to say, unlike a range of dates.
    const host = await field()
    host.open = true
    await host.updateComplete
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '09:15' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:15')
    expect(host.open).toBe(false)
  })

  /* Picking hands focus back with `2:45 PM` showing, and End, Backspace left
     `2:45 P` in the field and in `value`. */
  test('after a pick, the first key that edits puts the value in the field first', async () => {
    const host = await field('locale="en-US"')
    host.open = true
    await host.updateComplete
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '14:45' },
      }),
    )
    await host.updateComplete
    expect(control(host).value).toBe('2:45 PM')
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'End' }),
    )
    expect(control(host).value).toBe('14:45')
    await host.updateComplete
    expect(control(host).value).toBe('14:45')
    expect(host.value).toBe('14:45')
  })

  test('pressing into the field from outside opens the list', async () => {
    const host = await field()
    control(host).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('tabbing into the field leaves the list shut', async () => {
    const host = await field()
    control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('but a hand-off from inside does not, or picking a time reopens it', async () => {
    const host = await field()
    control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: part(host, 'trigger') }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to resolve in
    // the same tree as the control that points at it.
    const host = await field('hint="Any quarter hour"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any quarter hour')
  })
})

describe('the list a time input opens', () => {
  const picker = (host: InputTime): HTMLElement & { manual: boolean } =>
    part(host, 'picker') as HTMLElement & { manual: boolean }

  const pick = async (host: InputTime, value: string): Promise<void> => {
    ;(picker(host) as unknown as { requestValue(next: string): boolean }).requestValue(value)
    await host.updateComplete
  }

  /* Measured before this: the first ArrowDown chose the next time and closed
     the panel, so a reader moved one row per opening. */
  test('is manual, so its arrows move without choosing', async () => {
    const host = await field('default-value="09:30"')
    expect(picker(host).manual).toBe(true)
  })

  test('is handed the times the field bars, and a typed one is invalid', async () => {
    const host = await field('disable-times="10:00 11:00"')
    expect(picker(host).getAttribute('disable-times')).toBe('10:00 11:00')
    await type(host, '10:00')
    expect(internals(host).validity.valid).toBe(false)
    expect(internals(host).validationMessage).toBe('Choose a time that is available.')
  })

  test('closes on a time chosen from the list', async () => {
    const host = await field('default-value="09:30"')
    host.open = true
    await host.updateComplete
    await pick(host, '10:00')
    expect(host.value).toBe('10:00')
    expect(host.open).toBe(false)
  })

  /* Measured before this: turning the hour wheel closed the panel before a
     minute could be chosen. */
  test('stays open while the wheels turn', async () => {
    const host = await field('default-value="09:30" variant="wheels"')
    host.open = true
    await host.updateComplete
    await pick(host, '10:30')
    expect(host.value).toBe('10:30')
    expect(host.open).toBe(true)
  })

  test('draws no button for the current time unless `show-now` asks for one', async () => {
    const host = await field()
    host.open = true
    await host.updateComplete
    await (picker(host) as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(part(picker(host), 'now')).toBeNull()
  })

  /* Measured before this: the field handed its picker neither, so a time
     input could never offer the shortcut its own picker has. */
  test('hands `show-now` and `now-label` to its list, whose button sets the field', async () => {
    const host = await field('show-now now-label="Right now"')
    host.open = true
    await host.updateComplete
    const list = picker(host) as unknown as HTMLElement & {
      updateComplete: Promise<unknown>
      value: string
    }
    await list.updateComplete
    const now = part(list, 'now') as HTMLButtonElement
    expect(now.textContent).toBe('Right now')
    now.click()
    await host.updateComplete
    expect(host.value).toMatch(/^\d\d:(00|15|30|45)$/)
    expect(list.value).toBe(host.value)
    expect(host.open).toBe(false)
  })

  test('keeps a refused time off its list as well as off the field', async () => {
    const host = await field('default-value="09:30"')
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    await pick(host, '10:00')
    expect(host.value).toBe('09:30')
    expect((picker(host) as unknown as { value: string }).value).toBe('09:30')
  })
})

describe('the events a time input sends', () => {
  test('typing sends `input`, and `change` once the reader is done', async () => {
    const host = await field()
    const log: string[] = []
    for (const name of ['input', 'change']) {
      host.addEventListener(name, () => log.push(name))
    }
    await type(host, '09:')
    await type(host, '09:45')
    expect(log).toEqual(['input', 'input'])
    control(host).dispatchEvent(new Event('change'))
    expect(log).toEqual(['input', 'input', 'change'])
  })
})

describe('the panel of a time input', () => {
  /* The trigger said it opened a listbox, and the surface had no role. */
  test('is the dialog the trigger says it opens', async () => {
    const host = await field()
    expect(part(host, 'trigger')?.getAttribute('aria-haspopup')).toBe('dialog')
    expect(part(host, 'surface')?.getAttribute('role')).toBe('dialog')
    expect(part(host, 'surface')?.getAttribute('aria-label')).toBe('Choose a time')
  })
})

describe('a time input with seconds and a clock of its own', () => {
  test('takes a typed time to the second, and writes it so when idle', async () => {
    const host = await field('seconds locale="en-US"')
    await type(host, '14:05:09')
    expect(host.value).toBe('14:05:09')
    expect(internals(host).validity.valid).toBe(true)
    control(host).dispatchEvent(new FocusEvent('blur'))
    await host.updateComplete
    expect(control(host).value).toBe('2:05:09 PM')
  })

  test('without seconds, a time with them is not one it holds', async () => {
    const host = await field()
    await type(host, '14:05:09')
    expect(internals(host).validity.badInput).toBe(true)
  })

  test('a time before min or past max sets the flag a time input sets', async () => {
    const host = await field('min="09:00" max="17:00" disable-times="12:00"')
    await type(host, '08:30')
    expect(internals(host).validity.rangeUnderflow).toBe(true)
    expect(internals(host).validity.badInput).toBeFalsy()
    await type(host, '18:00')
    expect(internals(host).validity.rangeOverflow).toBe(true)
    await type(host, '12:00')
    expect(internals(host).validity.badInput).toBe(true)
    await type(host, '10:00')
    expect(internals(host).validity.valid).toBe(true)
  })

  test('hour-cycle writes the field and the list on the clock it names', async () => {
    const host = await field('locale="en-US" hour-cycle="h23" default-value="14:05"')
    expect(control(host).value).toBe('14:05')
    const picker = part(host, 'picker') as HTMLElement & { hourCycle?: string; seconds: boolean }
    expect(picker.hourCycle).toBe('h23')
    expect(picker.seconds).toBe(false)
  })
})

describe('segmented', () => {
  const segments = (host: HTMLElement): HTMLElement[] => [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="segment"]') ?? []),
  ]
  const press = async (host: InputTime, at: HTMLElement, key: string): Promise<void> => {
    at.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
    await host.updateComplete
  }

  test('the field is a segment for each part of the time, on the clock asked for', async () => {
    const host = await field(
      'segmented locale="en-US" hour-cycle="h23" seconds default-value="14:05:09"',
    )
    expect(part(host, 'control')).toBeNull()
    expect(segments(host).map((one) => one.dataset.segment)).toEqual(['hour', 'minute', 'second'])
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['14', '05', '09'])
  })

  test('a twelve hour locale has a segment for the half of the day', async () => {
    const host = await field('segmented locale="en-US" default-value="14:30"')
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['2', '30', 'PM'])
    await press(host, segments(host)[2] as HTMLElement, 'ArrowUp')
    expect(host.value).toBe('02:30')
  })

  test('a time from the list is what the segments show', async () => {
    const host = await field('segmented locale="en-GB" default-value="09:30"')
    ;(part(host, 'picker') as unknown as { requestValue(next: string): boolean }).requestValue(
      '11:15',
    )
    await host.updateComplete
    expect(host.value).toBe('11:15')
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['11', '15'])
  })

  test('a time the field bars is invalid', async () => {
    const host = await field('segmented locale="en-GB" disable-times="10:00" default-value="09:00"')
    await press(host, segments(host)[0] as HTMLElement, 'ArrowUp')
    expect(host.value).toBe('10:00')
    expect(internals(host).validity.valid).toBe(false)
  })
})

describe('the panel of a time input takes content of your own', () => {
  test('a header above the times and a footer under it', async () => {
    const host = (await mount(
      `<helix-headless-time-input label="Field"><h3 slot="panel-header">Saved</h3><button slot="panel-footer">Reset</button></helix-headless-time-input>`,
    )) as InputTime
    await host.updateComplete
    const surface = part(host, 'surface') as HTMLElement
    const slots = [...surface.querySelectorAll<HTMLSlotElement>(':scope > slot')]
    expect(slots.map((one) => one.name)).toEqual(['panel-header', 'panel-footer'])
    expect(slots[0]?.nextElementSibling?.getAttribute('part')).toBe('picker')
    expect(slots[0]?.assignedElements()[0]?.textContent).toBe('Saved')
    expect(slots[1]?.assignedElements()[0]?.textContent).toBe('Reset')
  })
})

/** An element inside a page section written in `lang`, which names no locale of its own. */
const inLang = async <T extends HTMLElement>(lang: string, markup: string): Promise<T> => {
  document.body.innerHTML = `<div lang="${lang}">${markup}</div>`
  const element = document.body.firstElementChild?.firstElementChild as T & {
    updateComplete: Promise<unknown>
  }
  await element.updateComplete
  return element
}

describe('a time input in a page written in another language', () => {
  test('hands the language to its picker', async () => {
    const host = await inLang(
      'de-DE',
      '<helix-headless-time-input label="Beginn"></helix-headless-time-input>',
    )
    expect(part(host, 'picker')?.getAttribute('locale')).toBe('de-DE')
  })
})

/* Time Picker gained a `feedback` part, and a page reached it inside a time
   input through nothing. */
test("forwards the picker's own message as `picker-feedback`", async () => {
  const host = await field()
  expect(part(host, 'picker')?.getAttribute('exportparts')).toContain('feedback: picker-feedback')
})

describe('input time with text that is no time', () => {
  /* The form held whatever was typed, `2:45 P` included, where a native time
     field sends a time it cannot read as empty. */
  test('gives the form an empty entry, and keeps the text in the value', async () => {
    const host = await field('name="t"')
    await type(host, '2:45 P')
    expect(host.value).toBe('2:45 P')
    expect((formValue(host) as FormData).getAll('t')).toEqual([''])
    await type(host, '14:45')
    expect(formValue(host)).toBe('14:45')
  })

  /* Measured before this: a range or a multiple was invalid and submitted the
     text, `09:00/10:30`, as its one entry. */
  test('in a range or a multiple too', async () => {
    for (const mode of ['range', 'multiple']) {
      const host = await field(`name="t" mode="${mode}"`)
      host.value = '09:00/10:30'
      await host.updateComplete
      expect(internals(host).validity.valid).toBe(false)
      expect((formValue(host) as FormData).getAll('t')).toEqual([''])
    }
  })
})

describe('the list a time input opens', () => {
  /* Measured before this: a field named by a slotted label or an `aria-label`
     opened a list named "Time". */
  test('is named as the field is', async () => {
    const name = (host: InputTime): string | null | undefined =>
      part(host, 'picker')?.getAttribute('label')
    expect(name(await field())).toBe('Starts')
    const slotted = (await mount(
      '<helix-headless-time-input><span slot="label">Doors open</span></helix-headless-time-input>',
    )) as InputTime
    await slotted.updateComplete
    expect(name(slotted)).toBe('Doors open')
    const aria = (await mount(
      '<helix-headless-time-input aria-label="Last entry"></helix-headless-time-input>',
    )) as InputTime
    await aria.updateComplete
    expect(name(aria)).toBe('Last entry')
  })
})

describe('input time takes content at either end', () => {
  test('in start and end, inside the field', async () => {
    const host = await field()
    const slots = [...(part(host, 'field')?.querySelectorAll(':scope > slot') ?? [])].map((one) =>
      one.getAttribute('name'),
    )
    expect(slots).toEqual(['start', 'end'])
  })
})

describe('a time input reads a time as you write one', () => {
  /* Measured before this: `2:30 PM` typed into the field was text and no time,
     and the form received nothing. */
  test('on either clock, as the field commits', async () => {
    const host = await field('name="t" locale="en-US"')
    await type(host, '2:30 PM')
    expect(host.value).toBe('2:30 PM')
    control(host).dispatchEvent(new Event('change'))
    await host.updateComplete
    expect(host.value).toBe('14:30')
    const french = await field('locale="fr-FR"')
    await type(french, '14h05')
    control(french).dispatchEvent(new Event('change'))
    await french.updateComplete
    expect(french.value).toBe('14:05')
  })

  test('and leaves text that is no time as it was', async () => {
    const host = await field('locale="en-US"')
    await type(host, 'teatime')
    control(host).dispatchEvent(new Event('change'))
    await host.updateComplete
    expect(host.value).toBe('teatime')
  })
})

describe('the text of a time input opens a list', () => {
  /* Measured before this: Down in the text opened the list while the text
     said nothing of a popup, a textbox with no `aria-expanded`. */
  test('so it says so, as a combobox with a dialog', async () => {
    const host = await field()
    expect(control(host).getAttribute('role')).toBe('combobox')
    expect(control(host).getAttribute('aria-haspopup')).toBe('dialog')
    expect(control(host).getAttribute('aria-controls')).toBe('surface')
    expect(control(host).getAttribute('aria-expanded')).toBe('false')
    ;(host as InputTime & { open: boolean }).open = true
    await host.updateComplete
    expect(control(host).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('a clearable time input', () => {
  test('shows a named button while it holds a time, which empties it', async () => {
    const host = await field('clearable default-value="09:30"')
    const heard: string[] = []
    for (const name of ['change', 'helix-clear']) {
      host.addEventListener(name, () => heard.push(name))
    }
    ;(part(host, 'clear') as HTMLButtonElement).click()
    await host.updateComplete
    expect(host.value).toBe('')
    expect(heard).toEqual(['change', 'helix-clear'])
    expect(part(host, 'clear')).toBeNull()
  })
})

describe('a time input holding nothing', () => {
  test('is blank, as a state', async () => {
    const host = (await field()) as InputTime & { internals: ElementInternals; value: string }
    expect(hasState(host, 'blank')).toBe(true)
    host.value = '09:30'
    await host.updateComplete
    expect(hasState(host, 'blank')).toBe(false)
  })
})

describe('a segmented time range', () => {
  test('is two rows of segments, the start and the end', async () => {
    const host = await field('segmented mode="range" locale="en-GB" default-value="09:00,17:30"')
    const shown = [...(host.shadowRoot?.querySelectorAll('[part~="segment"]') ?? [])].map((one) =>
      one.textContent?.trim(),
    )
    expect(shown).toEqual(['09', '00', '17', '30'])
    expect(part(host, 'range-separator')?.textContent?.trim()).toBe('–')
  })
})

describe('the message for text that is no time', () => {
  test('is a word of its own, with the shape in it', async () => {
    const host = (await field('unreadable-message="Uhrzeit als {shape}."')) as InputTime & {
      validationMessage: string
    }
    await type(host, 'soon')
    expect(host.validationMessage).toBe('Uhrzeit als HH:mm.')
  })
})

/* Opening on a time between two steps started the highlight from the top:
   the second Down highlighted midnight. */
describe('a time input holding a time between two steps', () => {
  test('opens its list on the nearest time, and Down moves on from it', async () => {
    const host = await field('value="14:07"')
    host.open = true
    await host.updateComplete
    const picker = part(host, 'picker') as HTMLElement & { updateComplete: Promise<unknown> }
    await picker.updateComplete
    const list = part(picker, 'list') as HTMLElement & { updateComplete: Promise<unknown> }
    await list.updateComplete
    const active = (): string | undefined =>
      [
        ...list.querySelectorAll<HTMLElement & { active: boolean; value: string }>(
          '[part~="option"]',
        ),
      ].find((option) => option.active)?.value
    expect(active()).toBe('14:00')
    part(list, 'items')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
    )
    await list.updateComplete
    expect(active()).toBe('14:15')
    expect(host.value).toBe('14:07')
  })
})

/* The APG date picker dialog returns focus to the button that opened it, and
   Color Input did. Measured before this: Escape after the trigger's press put
   focus in the text field, one control before where the reader had been. */
describe('where Escape hands focus back', () => {
  const pressEscape = (from: Element): void => {
    from.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Escape' }),
    )
  }

  test('to the trigger, when the trigger opened the panel', async () => {
    const host = await field()
    /* No focus first: happy-dom hands the trigger's `focusout` a target
       inside the picker's own shadow root, which reads as leaving, and shuts
       the panel. Chromium retargets it to the picker. */
    const trigger = part(host, 'trigger') as HTMLButtonElement
    trigger.click()
    await host.updateComplete
    expect(host.open).toBe(true)
    pressEscape(part(host, 'surface') as HTMLElement)
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(host.shadowRoot?.activeElement).toBe(trigger)
  })

  test('to the text, when ArrowDown from it opened the panel', async () => {
    const host = await field()
    control(host).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
    )
    await host.updateComplete
    expect(host.open).toBe(true)
    pressEscape(control(host))
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(host.shadowRoot?.activeElement).toBe(control(host))
  })
})
