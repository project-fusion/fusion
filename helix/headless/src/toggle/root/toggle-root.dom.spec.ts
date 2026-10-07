import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Toggle = HTMLElement & {
  focusable: boolean
  selected: boolean
  focusItem(): void
  select(): void
  updateComplete: Promise<boolean>
}

const toggle = async (attributes = 'value="a"'): Promise<Toggle> =>
  (await mount(`<helix-headless-toggle ${attributes}>Grid</helix-headless-toggle>`)) as Toggle

/** A toggle as a group holds it: the group writes `focusable` on every item. */
const held = async (attributes = 'value="a"'): Promise<Toggle> => {
  const host = await toggle(attributes)
  host.focusable = false
  await host.updateComplete
  return host
}

/**
 * One toggle, and the contract that is the toggle's rather than the group's.
 *
 * **The group already proves the coordination**, which is one selection at a
 * time, arrow keys moving between members and the value the group reports to a
 * form. What is left is what one option owns on its own.
 */
describe('one toggle', () => {
  /* `aria-checked` is written in both states rather than omitted when false,
     which is the opposite of `aria-current` on a playlist entry and is correct
     here for the reason the roles differ: an unchecked radio is one of the
     answers, and a reader is told how many there are and which is chosen. */
  test('says it is unchecked as well as checked, because both are answers', async () => {
    expect(part(await held(), 'item')?.getAttribute('aria-checked')).toBe('false')
    expect(part(await held('value="a" selected'), 'item')?.getAttribute('aria-checked')).toBe(
      'true',
    )
  })

  /* A real `disabled` button, so the platform refuses the press, and `select()`
     refuses too: the group calls that from its own key handling and never sees
     the button. */
  test('refuses from the platform and from the method the group calls', async () => {
    const host = await toggle('value="a" disabled')
    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })

    expect((part(host, 'item') as HTMLButtonElement).disabled).toBe(true)
    ;(part(host, 'item') as HTMLElement).click()
    host.select()
    expect(heard).toBe(0)
  })

  /* The tab stop normally rides on the selection, so an unanswered group had no
     stop at all and the keyboard could not reach it. `focusable` is the group
     lending it to the first member, and it is a property with no attribute
     because `tabindex` written onto a host a React consumer rendered is exactly
     the change hydration reports and does not patch up. */
  test('holds a tab stop when the group lends it one, and on its own', async () => {
    const host = await held()
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('-1')

    host.focusable = true
    await host.updateComplete
    expect(part(host, 'item')?.getAttribute('tabindex')).toBe('0')

    expect(part(await toggle(), 'item')?.getAttribute('tabindex')).toBe('0')
    expect(host.hasAttribute('tabindex')).toBe(false)
    expect(host.hasAttribute('focusable')).toBe(false)
  })

  /* The group drives the arrows and cannot reach the control, which is inside
     this shadow root, so the intent is a method rather than the group reaching
     through a part selector into a child's internals. */
  test('takes focus onto its own control when the group asks it to', async () => {
    const host = await toggle()
    host.focusItem()
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'item'))
  })

  test('announces what it stands for when it is chosen', async () => {
    const host = await toggle()
    let value: string | undefined
    host.addEventListener('helix-select', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(host, 'item') as HTMLElement).click()
    expect(value).toBe('a')
  })
})

describe('a toggle on its own', () => {
  /* Outside a group it said `role="radio"` and `aria-checked="false"`, and a
     press changed nothing, so there was no toggle button to use. */
  test('is a toggle button that a press flips, saying so with aria-pressed', async () => {
    document.body.innerHTML = '<helix-headless-toggle value="bold">Bold</helix-headless-toggle>'
    const toggle = document.body.firstElementChild as HTMLElement & {
      selected: boolean
      updateComplete: Promise<unknown>
    }
    await toggle.updateComplete
    await toggle.updateComplete
    const button = toggle.shadowRoot?.querySelector('[part="item"]') as HTMLButtonElement
    expect(button.hasAttribute('role')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('tabindex')).toBe('0')
    let changes = 0
    toggle.addEventListener('change', () => changes++)
    button.click()
    await toggle.updateComplete
    expect(toggle.selected).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(changes).toBe(1)
    toggle.addEventListener('helix-select', (event) => event.preventDefault(), { once: true })
    button.click()
    await toggle.updateComplete
    expect(toggle.selected).toBe(true)
    expect(changes).toBe(1)
  })

  test('starts pressed where the markup says selected', async () => {
    document.body.innerHTML =
      '<helix-headless-toggle value="bold" selected>Bold</helix-headless-toggle>'
    const toggle = document.body.firstElementChild as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await toggle.updateComplete
    expect(toggle.shadowRoot?.querySelector('[part="item"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})

/* Web Awesome's radio button takes content before and after its label, and a
   toggle took its label alone. */
describe('content around the label', () => {
  test('goes in the start and end slots, inside the button, around the label', async () => {
    const host = (await mount(
      '<helix-headless-toggle value="a"><span slot="start">*</span>Grid<span slot="end">3</span></helix-headless-toggle>',
    )) as Toggle
    const slots = [...(part(host, 'item')?.querySelectorAll('slot') ?? [])].map((slot) => slot.name)
    expect(slots).toEqual(['start', '', 'end'])
    const start = part(host, 'item')?.querySelector<HTMLSlotElement>('slot[name="start"]')
    expect(start?.assignedElements().map((one) => one.textContent)).toEqual(['*'])
  })
})

describe('a toggle with no name', () => {
  /* The missing-name warning is in development builds only, which the
     package's `test:dom` script asks for with `--conditions helix-development`. */
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

  test('is reported by its tag, an icon alone being no name', async () => {
    const warnings = await warnedOn(
      '<helix-headless-toggle><svg slot="start"></svg></helix-headless-toggle>',
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-headless-toggle> has no accessible name')
  })

  test('and a toggle with words, a label, or a labeled icon is not', async () => {
    for (const named of [
      '<helix-headless-toggle>Bold</helix-headless-toggle>',
      '<helix-headless-toggle aria-label="Bold"><svg slot="start"></svg></helix-headless-toggle>',
      '<helix-headless-toggle><svg slot="start" aria-label="Bold"></svg></helix-headless-toggle>',
    ]) {
      expect([named, ...(await warnedOn(named))]).toEqual([named])
    }
  })
})
