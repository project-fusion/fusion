import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

  test('something that is not a time says what one looks like', async () => {
    const host = await field()
    await type(host, '25:00')
    expect(internals(host).validationMessage).toBe('Enter a time as HH:mm.')
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
