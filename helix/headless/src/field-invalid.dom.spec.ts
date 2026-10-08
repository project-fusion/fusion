import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

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
/* The form's own `checkValidity()`, read before any Helix control connects. */
let nativeCheck: () => boolean

beforeAll(async () => {
  registerDom()
  nativeCheck = HTMLFormElement.prototype.checkValidity
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
 * Combobox was reported on its own, in round 11.
 */
describe('a required field checked from a script', () => {
  beforeAll(async () => {
    await import('./chat/index.js')
  })

  const CHECKED = [
    'helix-headless-chat-composer',
    'helix-headless-combobox',
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

/**
 * A script that checks a whole form learns its verdict, and no field in it
 * shows anything.
 *
 * `form.checkValidity()` fires `invalid` on every failing control, and the
 * fields took that as a submission attempt: an untouched required Checkbox
 * checked through its form turned `:state(invalid)` on and showed its message
 * in an alert. A native required checkbox in the same form stays off
 * `:user-invalid`, measured in Chromium. The field's own `checkValidity()`
 * was quiet already; this is the call on the form, which the platform runs
 * without asking the field.
 *
 * Across the shapes that listen for the attempt, in one form: the field
 * mixin's controls, a group, the pickers' feedback mixin, and the chat
 * composer. In the browser only: happy-dom's `form.checkValidity()` asks no
 * form-associated custom element, so there the call fires nothing to judge.
 */
describe('a form checked from a script', () => {
  beforeAll(async () => {
    await Promise.all([
      import('./chat/index.js'),
      import('./checkbox-group/index.js'),
      import('./date-picker/index.js'),
    ])
  })

  const FIELDS = [
    '<helix-headless-checkbox name="a" required>Accept</helix-headless-checkbox>',
    '<helix-headless-checkbox-group label="Pick" required><helix-headless-checkbox value="x">X</helix-headless-checkbox></helix-headless-checkbox-group>',
    '<helix-headless-chat-composer label="Message" required></helix-headless-chat-composer>',
    '<helix-headless-color-input label="Color" name="c" required></helix-headless-color-input>',
    '<helix-headless-combobox label="Fruit" name="f" required></helix-headless-combobox>',
    '<helix-headless-date-picker label="Day" name="d" required></helix-headless-date-picker>',
    '<helix-headless-input label="Name" name="n" required></helix-headless-input>',
    '<helix-headless-time-input label="Start" name="t" required></helix-headless-time-input>',
  ]

  type Checked = Updatable & { checkValidity(): boolean }

  /* The check is wrapped on the form a Helix control belongs to, never on the
     prototype: a library that changed `HTMLFormElement.prototype` would change
     every form on the page and stack under other code that wraps it. */
  test('wraps the form a Helix control is in, and leaves the prototype and every other form alone', async () => {
    document.body.innerHTML = `<form id="helix">${FIELDS[0]}</form>
      <form id="plain"><input required aria-label="Plain" /></form>`
    const helix = document.getElementById('helix') as HTMLFormElement
    const plain = document.getElementById('plain') as HTMLFormElement
    await settle(helix.firstElementChild as Checked)
    expect(HTMLFormElement.prototype.checkValidity).toBe(nativeCheck)
    expect(Object.hasOwn(helix, 'checkValidity')).toBe(true)
    expect(Object.hasOwn(plain, 'checkValidity')).toBe(false)
    let fired = 0
    plain.addEventListener('invalid', () => fired++, true)
    expect(plain.checkValidity()).toBe(false)
    expect(fired).toBe(1)
  })

  ;(hasLayout() ? test : test.skip)(
    'form.checkValidity() fires invalid on each field and marks none',
    async () => {
      const form = (await mount(`<form>${FIELDS.join('')}</form>`)) as unknown as HTMLFormElement
      const hosts = [...form.children] as Checked[]
      await Promise.all(hosts.map((host) => settle(host)))
      const fired = new Set<Element>()
      for (const host of hosts) {
        host.addEventListener('invalid', () => fired.add(host))
      }
      expect(form.checkValidity()).toBe(false)
      expect(fired.size).toBe(hosts.length)
      await Promise.all(hosts.map((host) => settle(host)))
      const marked = hosts
        .filter((host) => {
          const internals = (host as unknown as { internals: ElementInternals }).internals
          return (
            (internals.states as unknown as Set<string>).has('invalid') ||
            internals.ariaInvalid === 'true'
          )
        })
        .map((host) => host.localName)
      expect(marked).toEqual([])
    },
  )
})

/**
 * A script that writes a value and asks at once is answered about that value.
 *
 * A control reports its verdict as it updates, and an update waits for a
 * microtask, so `checkValidity()` straight after a write answered about the
 * value before it: a Time Input given a time past its `max` said it was valid
 * until `updateComplete`. A native control answers about the value it was just
 * given. In `HelixFormElement`, so every form control has it.
 */
describe('a field asked about a value a script just wrote', () => {
  type Written = Updatable & { checkValidity(): boolean; validity: ValidityState; value: string }

  const written = async (markup: string): Promise<Written> => {
    const host = (await mount(markup)) as Written
    await settle(host)
    return host
  }

  test('time input: a time past max is invalid at once', async () => {
    const host = await written(
      '<helix-headless-time-input label="Start" required min="09:00" max="17:00" value="10:00"></helix-headless-time-input>',
    )
    expect(host.checkValidity()).toBe(true)
    host.value = '18:00'
    expect(host.checkValidity()).toBe(false)
    expect(host.validity.rangeOverflow).toBe(true)
  })

  test('time picker: an emptied required range is missing at once', async () => {
    const host = await written(
      '<helix-headless-time-picker label="Slot" required mode="range" value="09:00"></helix-headless-time-picker>',
    )
    expect(host.checkValidity()).toBe(true)
    host.value = ''
    expect(host.checkValidity()).toBe(false)
    expect(host.validity.valueMissing).toBe(true)
  })

  test('number input: a number past max is invalid at once', async () => {
    const host = await written(
      '<helix-headless-number-input label="Count" max="5" value="3"></helix-headless-number-input>',
    )
    expect(host.validity.valid).toBe(true)
    host.value = '9'
    expect(host.validity.valid).toBe(false)
  })
})
