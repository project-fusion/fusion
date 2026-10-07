import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * A field showing a message says it is wrong, on the control a reader is on.
 *
 * **The host is not what a screen reader is on.** Every field set `ariaInvalid`
 * on its host's internals, and read from Chromium's accessibility tree an Input
 * showing "Too short" was a textbox reporting `invalid: false`, described by
 * its message: a reader heard the message as though it were a hint. The same
 * held for Select and Combobox.
 *
 * Across families, because the rule is the field mixin's and each family binds
 * it in its own template. The control is found by what already points at the
 * message, `aria-describedby`, so a family that gains a control is covered
 * without this file being edited.
 */
beforeAll(async () => {
  registerDom()
  /* The families this exercises, not the barrel: see `native-events.dom.spec.ts`
     for why importing the barrel here would empty `hydration.dom.spec.ts`. */
  await Promise.all([
    import('./checkbox/index.js'),
    import('./color-input/index.js'),
    import('./color-picker/index.js'),
    import('./combobox/index.js'),
    import('./date-input/index.js'),
    import('./file-input/index.js'),
    import('./filter-input/index.js'),
    import('./input/index.js'),
    import('./listbox/index.js'),
    import('./number-input/index.js'),
    import('./pin-input/index.js'),
    import('./rating/index.js'),
    import('./select/index.js'),
    import('./slider/index.js'),
    import('./switch/index.js'),
    import('./textarea/index.js'),
    import('./time-input/index.js'),
    import('./time-picker/index.js'),
  ])
})

const FAMILIES = [
  'checkbox',
  'color-input',
  'combobox',
  'date-input',
  'file-input',
  'filter-input',
  'input',
  'listbox',
  'number-input',
  'pin-input',
  'rating',
  'select',
  'slider',
  'switch',
  'textarea',
  'time-input',
]

type Field = Updatable & { feedback: string }

const field = async (family: string): Promise<Field> =>
  (await mount(
    `<helix-headless-${family} label="Field" feedback="Too short"></helix-headless-${family}>`,
  )) as Field

/** The elements the message describes, in the field's own shadow root. */
const described = (host: Field): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[aria-describedby="helix-feedback"]') ?? []),
]

const invalid = (host: Field): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[aria-invalid]') ?? []),
]

describe('a field showing a message', () => {
  for (const family of FAMILIES) {
    test(`${family}: the control it describes says it is invalid`, async () => {
      const host = await field(family)
      expect(described(host).length).toBeGreaterThan(0)
      for (const control of described(host)) {
        expect(control.getAttribute('aria-invalid')).toBe('true')
      }
    })

    test(`${family}: and stops saying so when the message goes`, async () => {
      const host = await field(family)
      host.feedback = ''
      await settle(host)
      expect(invalid(host)).toEqual([])
    })
  }
})

/**
 * A picker marked invalid says so on what a reader is on.
 *
 * Neither host has a role, so `ariaInvalid` on its internals reached nothing:
 * read from Chromium's tree, an invalid Color Picker's sliders and value, and
 * an invalid Time Picker's list, all reported no invalid state.
 */
describe('a picker marked invalid', () => {
  const inner = (host: Element | null | undefined, part: string): Element | null | undefined =>
    host?.shadowRoot?.querySelector(`[part="${part}"]`)

  test('color picker: the value, the square, and the hue slider', async () => {
    const host = await mount('<helix-headless-color-picker invalid></helix-headless-color-picker>')
    await settle(host as Updatable)
    for (const part of ['value', 'grid-saturation', 'grid-brightness']) {
      expect(inner(host, part)?.getAttribute('aria-invalid')).toBe('true')
    }
    const hue = inner(host, 'channel')
    await settle(hue as Updatable)
    expect(inner(hue, 'control')?.getAttribute('aria-invalid')).toBe('true')
  })

  test('time picker: its list, and the list inside that', async () => {
    const host = await mount('<helix-headless-time-picker invalid></helix-headless-time-picker>')
    await settle(host as Updatable)
    const list = host.shadowRoot?.querySelector('[part="list"], [part="column"]')
    expect(list?.getAttribute('aria-invalid')).toBe('true')
    await settle(list as Updatable)
    expect(inner(list, 'items')?.getAttribute('aria-invalid')).toBe('true')
  })
})

/* What a server that has already judged a field writes, carried to the control
   by `AriaForwardController` as the other states are. */
describe('a field written aria-invalid', () => {
  test('passes it to its control', async () => {
    const host = (await mount(
      '<helix-headless-input label="Name" aria-invalid="true"></helix-headless-input>',
    )) as Updatable
    await settle(host)
    expect(host.shadowRoot?.querySelector('[part="control"]')?.getAttribute('aria-invalid')).toBe(
      'true',
    )
  })
})

/**
 * A script that checks a field learns its verdict, and the field shows nothing.
 *
 * `checkValidity()` fires `invalid` on a failing control, and every field took
 * that event as a reader's attempt: an untouched required Time Input checked
 * from a script turned `:state(invalid)` on and said `aria-invalid="true"`
 * before anybody had used it. A native `<input>` checked the same way stays
 * unmarked, measured in Chromium, where `:user-invalid` stays off. So a check
 * only reports, and `reportValidity()` is the call that shows the message.
 *
 * Across the shapes that listen for the attempt: the field mixin's controls,
 * the pickers' feedback mixin, and the chat composer, which keeps its own.
 */
describe('a required field checked from a script', () => {
  beforeAll(async () => {
    await import('./chat/index.js')
  })

  const CHECKED = [
    'helix-headless-chat-composer',
    'helix-headless-input',
    'helix-headless-textarea',
    'helix-headless-time-input',
    'helix-headless-time-picker',
  ]

  type Checked = Updatable & { checkValidity(): boolean; reportValidity(): boolean }

  const required = async (tag: string): Promise<Checked> => {
    const host = (await mount(`<${tag} label="Field" required></${tag}>`)) as Checked
    await settle(host)
    return host
  }

  const shown = (host: Checked): boolean => {
    const internals = (host as unknown as { internals: ElementInternals }).internals
    return (
      (internals.states as unknown as Set<string>).has('invalid') ||
      internals.ariaInvalid === 'true' ||
      invalid(host as unknown as Field).some((node) => node.getAttribute('aria-invalid') === 'true')
    )
  }

  for (const tag of CHECKED) {
    test(`${tag}: checkValidity() fires invalid and shows nothing`, async () => {
      const host = await required(tag)
      let fired = 0
      host.addEventListener('invalid', () => fired++)
      expect(host.checkValidity()).toBe(false)
      expect(fired).toBe(1)
      await settle(host)
      expect(shown(host)).toBe(false)
    })

    test(`${tag}: reportValidity() shows the message`, async () => {
      const host = await required(tag)
      expect(host.reportValidity()).toBe(false)
      await settle(host)
      expect(shown(host)).toBe(true)
    })
  }
})
