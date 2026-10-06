import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-headless-button-group label="Text alignment">
  <helix-headless-button>Left</helix-headless-button>
  <helix-headless-button>Center</helix-headless-button>
  <helix-headless-button>Right</helix-headless-button>
</helix-headless-button-group>`

describe('button group', () => {
  test('is a named group, set on internals rather than on the host', async () => {
    // A run of buttons with no name is announced as separate controls, which is
    // what the grouping exists to say it is not.
    const group = (await mount(markup)) as HTMLElement & { internals?: ElementInternals }
    expect(role(group)).toBe('group')
    expect(group.internals?.ariaLabel).toBe('Text alignment')
    expect(group.getAttributeNames()).toEqual(['label'])
  })

  test('an author `aria-label` overrides the property', async () => {
    const group = (await mount(
      '<helix-headless-button-group aria-label="Alignment" label="Text alignment"></helix-headless-button-group>',
    )) as HTMLElement
    expect(group.getAttribute('aria-label')).toBe('Alignment')
  })

  test("the buttons stay the consumer's own elements", async () => {
    const group = await mount(markup)
    expect(slotted(group)).toHaveLength(3)
  })

  test('every button keeps its own tab stop', async () => {
    // A group is not a toolbar. The APG toolbar pattern asks for one tab stop
    // with arrow keys inside it, and nothing here touches tabindex.
    const group = await mount(markup)
    for (const button of [...group.querySelectorAll('helix-headless-button')]) {
      expect(button.hasAttribute('tabindex')).toBe(false)
    }
  })
})

/**
 * What the console was warned while `markup` mounted and settled.
 *
 * The missing-name warning is in development builds only: the package's
 * `test:dom` script passes `bun test --conditions helix-development`, which
 * core's `#audit-name` reads as it reads `development`.
 */
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

describe('a button group with no name', () => {
  test('is reported once, by its tag', async () => {
    const warnings = await warnedOn('<helix-headless-button-group></helix-headless-button-group>')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-button-group> has no accessible name')
  })

  test('and one named by `label`, `aria-label` or `aria-labelledby` is not', async () => {
    for (const markup of [
      '<helix-headless-button-group label="Alignment"></helix-headless-button-group>',
      '<helix-headless-button-group aria-label="Alignment"></helix-headless-button-group>',
      '<helix-headless-button-group aria-labelledby="t"></helix-headless-button-group><p id="t">Alignment</p>',
    ]) {
      expect([markup, ...(await warnedOn(markup))]).toEqual([markup])
    }
  })
})

type Group = HTMLElement & {
  requestUpdate(): void
  selectionMode?: string | undefined
  updateComplete: Promise<unknown>
  value: string
}
type Pressable = HTMLElement & { focusable: boolean; updateComplete: Promise<unknown> }

/** The control inside a button, which is what a reader is on. */
const inner = (button: Element): HTMLButtonElement =>
  button.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement

/** The buttons of a group, in order. */
const buttonsOf = (group: Element): Pressable[] =>
  [...group.querySelectorAll('helix-headless-button')] as Pressable[]

/** Mounts a group and lets every write land. */
const mountGroup = async (markup: string): Promise<Group> => {
  await import('../../button/index.js')
  const group = (await mount(markup)) as Group
  for (const button of buttonsOf(group)) {
    await button.updateComplete
  }
  return flush(group)
}

/** Lets the group update and the writes it waits on land. */
const flush = async (group: Group): Promise<Group> => {
  group.requestUpdate()
  await group.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  return group
}

/** What each button's control says about being pressed. */
const pressedOf = (group: Element): (string | null)[] =>
  buttonsOf(group).map((button) => inner(button).getAttribute('aria-pressed'))

const view = `<helix-headless-button-group label="Calendar view" selection-mode="single" value="week">
  <helix-headless-button value="day">Day</helix-headless-button>
  <helix-headless-button value="week">Week</helix-headless-button>
  <helix-headless-button value="month">Month</helix-headless-button>
</helix-headless-button-group>`

/* WA and Shoelace put a set of toggles in a group, and React Aria's
   ToggleButtonGroup is one: until this a pressed view had nowhere to say so. */
describe('a button group with selection-mode', () => {
  test('is a toolbar of toggle buttons, pressed on the control inside each', async () => {
    const group = await mountGroup(view)
    expect(role(group)).toBe('toolbar')
    expect(pressedOf(group)).toEqual(['false', 'true', 'false'])
  })

  test("writes nothing onto the consumer's markup", async () => {
    // An attribute on a button the consumer rendered is a hydration mismatch.
    const group = await mountGroup(view)
    expect(group.getAttributeNames()).toEqual(['label', 'selection-mode', 'value'])
    expect(buttonsOf(group).map((button) => button.getAttributeNames())).toEqual([
      ['value'],
      ['value'],
      ['value'],
    ])
  })

  test('single: a press presses one and releases the other, and a second press releases it', async () => {
    const group = await mountGroup(view)
    const [day] = buttonsOf(group)
    inner(day as Element).click()
    await flush(group)
    expect(group.value).toBe('day')
    expect(pressedOf(group)).toEqual(['true', 'false', 'false'])
    inner(day as Element).click()
    await flush(group)
    expect(group.value).toBe('')
    expect(pressedOf(group)).toEqual(['false', 'false', 'false'])
  })

  test('multiple: each press presses or releases one, and the rest stay', async () => {
    const group = await mountGroup(view.replace('"single"', '"multiple"'))
    const [day, , month] = buttonsOf(group)
    inner(day as Element).click()
    inner(month as Element).click()
    await flush(group)
    expect(group.value).toBe('week, day, month')
    expect(pressedOf(group)).toEqual(['true', 'true', 'true'])
    inner(day as Element).click()
    await flush(group)
    expect(group.value).toBe('week, month')
  })

  test('a press asks first with helix-before-change, and a refusal keeps the buttons', async () => {
    const group = await mountGroup(view)
    const heard: string[] = []
    group.addEventListener('helix-before-change', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
      event.preventDefault()
    })
    group.addEventListener('change', () => heard.push('change'))
    inner(buttonsOf(group)[0] as Element).click()
    await flush(group)
    expect(heard).toEqual(['day'])
    expect(group.value).toBe('week')
    expect(pressedOf(group)).toEqual(['false', 'true', 'false'])
  })

  test('and change follows a press that stood', async () => {
    const group = await mountGroup(view)
    let changes = 0
    group.addEventListener('change', () => {
      changes += 1
    })
    inner(buttonsOf(group)[2] as Element).click()
    expect(changes).toBe(1)
  })

  test('is one tab stop, on the pressed button, and focus moves it', async () => {
    const group = await mountGroup(view)
    const buttons = buttonsOf(group)
    expect(buttons.map((button) => button.focusable)).toEqual([false, true, false])
    buttons[2]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    await flush(group)
    expect(buttons.map((button) => button.focusable)).toEqual([false, false, true])
  })

  test('the arrow keys move focus without pressing', async () => {
    const group = await mountGroup(view)
    const [, week, month] = buttonsOf(group)
    let focused: Element | undefined
    for (const button of buttonsOf(group)) {
      button.focus = () => {
        focused = button
      }
    }
    week?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
    )
    expect(focused).toBe(month)
    expect(group.value).toBe('week')
  })

  test('a button without a value, or with its own aria-pressed, is left alone', async () => {
    const group =
      await mountGroup(`<helix-headless-button-group label="Text" selection-mode="multiple">
      <helix-headless-button value="bold">Bold</helix-headless-button>
      <helix-headless-button>Clear</helix-headless-button>
      <helix-headless-button value="mine" aria-pressed="true">Mine</helix-headless-button>
    </helix-headless-button-group>`)
    expect(pressedOf(group)).toEqual(['false', null, 'true'])
    inner(buttonsOf(group)[1] as Element).click()
    await flush(group)
    expect(group.value).toBe('')
  })

  test('a native button in a selection mode is reported once, and one with its own aria-pressed is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mountGroup(`<helix-headless-button-group label="Text" selection-mode="multiple">
        <button type="button">Bold</button><button type="button">Italic</button>
      </helix-headless-button-group>`)
      await mountGroup(`<helix-headless-button-group label="Text" selection-mode="multiple">
        <button type="button" aria-pressed="false">Bold</button>
      </helix-headless-button-group>`)
      await mountGroup(`<helix-headless-button-group label="Text">
        <button type="button">Bold</button>
      </helix-headless-button-group>`)
    } finally {
      console.warn = original
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-button-group> cannot press a native <button>')
  })

  test('without selection-mode the buttons are untouched, and leaving it puts them back', async () => {
    const plain = await mountGroup(view.replace(' selection-mode="single"', ''))
    expect(role(plain)).toBe('group')
    expect(pressedOf(plain)).toEqual([null, null, null])
    expect(buttonsOf(plain).map((button) => button.focusable)).toEqual([true, true, true])
    const group = await mountGroup(view)
    group.selectionMode = undefined
    await flush(group)
    expect(role(group)).toBe('group')
    expect(pressedOf(group)).toEqual([null, null, null])
    expect(buttonsOf(group).map((button) => button.focusable)).toEqual([true, true, true])
  })

  test('a button that leaves the group is put back', async () => {
    const group = await mountGroup(view)
    const [day] = buttonsOf(group)
    day?.remove()
    document.body.append(day as Element)
    await flush(group)
    expect(inner(day as Element).hasAttribute('aria-pressed')).toBe(false)
    expect(day?.focusable).toBe(true)
  })

  test("inside a toolbar it is a group, and the toolbar's keys own the stop", async () => {
    // A toolbar inside a toolbar is a reader's dead end.
    document.body.innerHTML = `<div role="toolbar">${view}</div>`
    const group = document.querySelector('helix-headless-button-group') as Group
    await flush(group)
    expect(role(group)).toBe('group')
    expect(buttonsOf(group).map((button) => button.focusable)).toEqual([true, true, true])
  })
})
