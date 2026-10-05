import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** What the console was warned while `markup` mounted and settled, with nothing printed. */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await mount(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

type Input = HTMLElement & {
  updateComplete: Promise<boolean>
  value: string
}

const control = (host: HTMLElement): HTMLInputElement => part(host, 'control') as HTMLInputElement

const enter = (host: HTMLElement): KeyboardEvent => {
  const event = new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' })
  control(host).dispatchEvent(event)
  return event
}

describe('Enter in the field', () => {
  /* The `<input>` is in a shadow root and has no form owner, so the platform
     never ran implicit submission for it, and Enter did nothing at all. */
  test('presses the form’s default button', async () => {
    document.body.innerHTML =
      '<form><helix-headless-input name="q" label="Search"></helix-headless-input><button>Go</button></form>'
    const host = document.querySelector('helix-headless-input') as Input
    await host.updateComplete
    let pressed = 0
    document.querySelector('button')?.addEventListener('click', (event) => {
      event.preventDefault()
      pressed += 1
    })
    enter(host)
    expect(pressed).toBe(1)
  })

  test('and submits a form with no button and no other field', async () => {
    document.body.innerHTML =
      '<form><helix-headless-input name="q" label="Search"></helix-headless-input></form>'
    const host = document.querySelector('helix-headless-input') as Input
    await host.updateComplete
    let submitted = 0
    document.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted += 1
    })
    enter(host)
    expect(submitted).toBe(1)
  })

  test('does nothing outside a form', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search"></helix-headless-input>',
    )) as Input
    expect(() => enter(host)).not.toThrow()
  })
})

describe('the clear button', () => {
  /* The native control never saw an edit, so no `change` of its own followed,
     and a consumer saving on `change` never learned the field was emptied. */
  test('announces change as well as input', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search" clearable value="abc"></helix-headless-input>',
    )) as Input
    const heard: string[] = []
    host.addEventListener('input', () => heard.push('input'))
    host.addEventListener('change', () => heard.push(`change:${host.value}`))
    ;(part(host, 'clear') as HTMLButtonElement).click()
    expect(heard).toEqual(['input', 'change:'])
  })

  test('and nothing when the clear is refused', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search" clearable value="abc"></helix-headless-input>',
    )) as Input
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    let changes = 0
    host.addEventListener('change', () => {
      changes += 1
    })
    ;(part(host, 'clear') as HTMLButtonElement).click()
    expect(changes).toBe(0)
    expect(host.value).toBe('abc')
  })
})

describe('what the host passes to its input', () => {
  test('the keyboard a phone offers and the label on its Enter key', async () => {
    const host = await mount(
      '<helix-headless-input label="Code" inputmode="numeric" enterkeyhint="search" autocapitalize="off"></helix-headless-input>',
    )
    const input = control(host)
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(input.getAttribute('enterkeyhint')).toBe('search')
    expect(input.getAttribute('autocapitalize')).toBe('off')
  })

  /* `type="number"` was accepted with no bounds at all, so a `max` written on
     it was ignored and 9 passed for a field that allows 5. */
  test('the bounds of a number, which the platform then judges', async () => {
    const host = await mount(
      '<helix-headless-input label="Guests" type="number" min="1" max="5" step="2"></helix-headless-input>',
    )
    const input = control(host)
    expect(input.getAttribute('min')).toBe('1')
    expect(input.getAttribute('max')).toBe('5')
    expect(input.getAttribute('step')).toBe('2')
  })
})

describe('a field with no name', () => {
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn('<helix-headless-input></helix-headless-input>')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-input> has no accessible name')
  })

  test('a label, an aria-label, a slotted label or a page label names it', async () => {
    for (const markup of [
      '<helix-headless-input label="Email"></helix-headless-input>',
      '<helix-headless-input aria-label="Email"></helix-headless-input>',
      '<helix-headless-input><span slot="label">Email</span></helix-headless-input>',
      '<div><label for="email">Email</label><helix-headless-input id="email"></helix-headless-input></div>',
    ]) {
      expect([markup, ...(await warnedOn(markup))]).toEqual([markup])
    }
  })
})

describe('clearing and stepping', () => {
  type Field = Input & { stepDown: (count?: number) => void; stepUp: (count?: number) => void }

  /* Web Awesome sends wa-clear. A consumer resetting a search on the clear
     button alone could not tell it from typing the field empty. */
  test('the clear button sends helix-clear after input and change', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search" clearable value="cats"></helix-headless-input>',
    )) as Field
    const heard: string[] = []
    for (const name of ['input', 'change', 'helix-clear']) {
      host.addEventListener(name, () => heard.push(name))
    }
    ;(part(host, 'clear') as HTMLElement).click()
    await host.updateComplete
    expect(host.value).toBe('')
    expect(heard).toEqual(['input', 'change', 'helix-clear'])
  })

  test('a refused clear sends no helix-clear', async () => {
    const host = (await mount(
      '<helix-headless-input label="Search" clearable value="cats"></helix-headless-input>',
    )) as Field
    let cleared = 0
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    host.addEventListener('helix-clear', () => {
      cleared += 1
    })
    ;(part(host, 'clear') as HTMLElement).click()
    await host.updateComplete
    expect([host.value, cleared]).toEqual(['cats', 0])
  })

  test('stepUp and stepDown move a number by its step, within its bounds', async () => {
    const host = (await mount(
      '<helix-headless-input label="Seats" type="number" step="5" max="12" value="0"></helix-headless-input>',
    )) as Field
    host.stepUp()
    expect(host.value).toBe('5')
    host.stepUp(3)
    expect(host.value).toBe('10')
    /* Once: happy-dom's own `stepDown(2)` moves one step, measured, where a
       browser moves two. */
    host.stepDown()
    expect(host.value).toBe('5')
  })
})

describe('your own rule, and an empty field', () => {
  type Checked = Input & {
    validate?: (value: string) => string | string[] | true | null | undefined
    validationMessage: string
  }

  /* React Aria's TextField takes a validate function. A custom error went
     through feedback or setCustomValidity, written again on every change. */
  test('validate runs on every change and its message is the verdict', async () => {
    const host = (await mount(
      '<helix-headless-input label="Handle" value="ada"></helix-headless-input>',
    )) as Checked
    host.validate = (value) => (value.length < 4 ? 'Use four characters or more.' : true)
    await host.updateComplete
    expect(host.validationMessage).toBe('Use four characters or more.')
    host.value = 'lovelace'
    await host.updateComplete
    expect(host.validationMessage).toBe('')
  })

  test('a list of messages is said as one, and the browser speaks first', async () => {
    const host = (await mount(
      '<helix-headless-input label="Handle" required></helix-headless-input>',
    )) as Checked
    host.validate = () => ['Too short.', 'Taken.']
    await host.updateComplete
    expect(host.validationMessage).not.toBe('Too short. Taken.')
    host.value = 'ada'
    await host.updateComplete
    expect(host.validationMessage).toBe('Too short. Taken.')
  })

  /* Web Awesome's input carries :state(blank). */
  test('says it is blank while it holds no text', async () => {
    const host = (await mount(
      '<helix-headless-input label="Name"></helix-headless-input>',
    )) as Input
    const states = (host as unknown as { internals: ElementInternals }).internals.states
    expect(states.has('blank')).toBe(true)
    host.value = 'Ada'
    await host.updateComplete
    expect(states.has('blank')).toBe(false)
  })
})
