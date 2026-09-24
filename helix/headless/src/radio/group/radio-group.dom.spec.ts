import { beforeAll, describe, expect, test } from 'bun:test'
import {
  at,
  formValue,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const group = async (extra = '', chosen = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-radio-group label="Label" name="choice" ${extra} default-value="${chosen}">
    <helix-headless-radio value="one">One</helix-headless-radio>
    <helix-headless-radio value="two">Two</helix-headless-radio>
    <helix-headless-radio value="three">Three</helix-headless-radio>
  </helix-headless-radio-group>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

const options = (host: Updatable): (HTMLElement & { selected: boolean; value: string })[] =>
  [...host.children] as (HTMLElement & { selected: boolean; value: string })[]

describe('radio group', () => {
  test('is a radio group, named on internals rather than on the host', async () => {
    // Through internals, so nothing lands on the host as an attribute a React
    // consumer's server markup never had.
    const host = (await group()) as Updatable & { internals: ElementInternals }
    expect(host.internals.role).toBe('radiogroup')
    expect(host.getAttribute('role')).toBeNull()
  })

  test('the value chooses one item and no other', async () => {
    const host = await group('', 'two')
    expect(options(host).map((item) => item.selected)).toEqual([false, true, false])
  })

  test('state travels down, so nothing sets itself', async () => {
    /* The item announces and the group decides. An item that applied its own
       selection would be a second answer to "which one is on", and the two
       would disagree the first time a listener refused a change. */
    const host = await group()
    const [first] = options(host)
    ;(first as unknown as { select: () => void }).select()
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('one')
    expect(options(host).map((item) => item.selected)).toEqual([true, false, false])
  })

  test('a refused change leaves the answer alone', async () => {
    const host = await group()
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    ;(options(host)[1] as unknown as { select: () => void }).select()
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('')
    expect(options(host).every((item) => !item.selected)).toBe(true)
  })

  test('and refusing the choice`s own event leaves the answer alone too', async () => {
    /* `helix-select` is cancelable and `Radio` documents it as refusable. The
       group is the one thing that acts on it, so a refusal it ignored was a
       veto that did nothing anywhere: valid code, no error, and the answer
       moving regardless. Bound on the choice, which is the position a consumer
       ruling out one answer has and `helix-before-change` does not reach. */
    const host = await group()
    const second = options(host)[1] as unknown as HTMLElement & { select: () => void }
    second.addEventListener('helix-select', (event) => event.preventDefault())
    second.select()
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('')
    expect(options(host).every((item) => !item.selected)).toBe(true)
  })

  test('the keyboard moves and chooses in one go', async () => {
    /* Which is what a radio group does, and is the difference from a listbox:
       moving without choosing leaves a keyboard reader on an item they have not
       selected with nothing saying so. */
    const host = await group('', 'one')
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('two')

    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }))
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('three')
  })

  test('an empty group is still reachable by tab, on the radio and not on its host', async () => {
    /* Every item at `tabindex="-1"` is a group the keyboard cannot enter, which
       is what a roving index does when nothing has been chosen yet.

       The stop is the `<button role="radio">` rather than the element around
       it. Written on the host it was markup a consumer rendered and their
       server never sent, and it put the tab stop on an unnamed box where a
       native group gives a reader an unchecked radio. */
    const host = await group()
    const [first, second] = options(host)
    expect(first?.hasAttribute('tabindex')).toBe(false)
    expect(part(first as HTMLElement, 'item')?.getAttribute('tabindex')).toBe('0')
    expect(part(second as HTMLElement, 'item')?.getAttribute('tabindex')).toBe('-1')
  })

  test('and the stop moves to the answer once there is one', async () => {
    // An answered group carrying the entry stop as well has two tab stops, so
    // a form stops twice on one question and stops first on a wrong answer.
    const host = await group('', 'two')
    const stops = options(host).map((item) => part(item, 'item')?.getAttribute('tabindex'))
    expect(stops).toEqual(['-1', '0', '-1'])
  })

  test('a value naming no choice is still a group the keyboard can enter', async () => {
    /* `value === ''` read this as answered, so a group seeded with a value no
       item carries left every choice at `-1` and the set unreachable: the exact
       failure the entry stop exists to prevent, arrived at through the test
       for it. */
    const host = await group('', 'nobody')
    expect(options(host).every((item) => !item.selected)).toBe(true)
    expect(part(options(host)[0] as HTMLElement, 'item')?.getAttribute('tabindex')).toBe('0')
  })

  test('and the entry skips a choice that cannot be made', async () => {
    // A disabled `<button>` takes no focus at all, so a group whose first
    // option is disabled would be unreachable with the stop parked on it.
    document.body.innerHTML = `<helix-headless-radio-group label="Label" name="choice">
      <helix-headless-radio disabled value="one">One</helix-headless-radio>
      <helix-headless-radio value="two">Two</helix-headless-radio>
    </helix-headless-radio-group>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    const stops = options(host).map((item) => part(item, 'item')?.getAttribute('tabindex'))
    expect(stops).toEqual(['-1', '0'])
  })

  test('an arrow in a field inside the group moves its caret, not the answer', async () => {
    /* A group holds more than its items often enough: "Other" with a field
       beside it. The arrows there are the field's, and the answer moved with
       the caret. */
    const host = await group('', 'two')
    const field = document.createElement('input')
    host.append(field)
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    await settle(host)
    expect((host as Updatable & { value: string }).value).toBe('two')
  })
})

describe('radio group in a form', () => {
  test('the group submits, not the items', async () => {
    /* The asymmetry with checkboxes. A set of radios is one answer, so the
       group owns the name and the value; a set of checkboxes is several, so
       each box submits its own. */
    const host = await group('', 'two')
    expect(formValue(host)).toBe('two')
    expect(formValue(options(host)[1] as HTMLElement)).toBeUndefined()
  })

  test('nothing chosen submits nothing, rather than a blank', async () => {
    const host = await group()
    expect(formValue(host)).toBeNull()
  })

  test('a reset returns it to the answer the markup declared', async () => {
    const host = (await group('default-value="three"')) as Updatable & {
      formResetCallback: () => void
      value: string
    }
    host.value = 'one'
    await settle(host)
    host.formResetCallback()
    await settle(host)
    expect(formValue(host)).toBe('three')
  })

  test('required says so in its own words once asked', async () => {
    const host = await group('required')
    expect(part(host, 'feedback')).toBeNull()

    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    expect((part(host, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Choose one to continue.',
    )

    ;(host as Updatable & { value: string }).value = 'one'
    await settle(host)
    expect(part(host, 'feedback')).toBeNull()
  })
})

describe('radio group as a field', () => {
  test('the question is named and described on the host', async () => {
    const host = (await group('hint="Hint"')) as Updatable & { internals: ElementInternals }
    expect(host.internals.ariaLabelledByElements?.[0]?.textContent?.trim()).toBe('Label')
    expect(host.internals.ariaDescribedByElements?.[0]?.textContent?.trim()).toBe('Hint')
  })

  test('orientation lays out the choices, not the field', async () => {
    const host = await group('orientation="horizontal"')
    const items = part(host, 'items') as HTMLElement
    expect(items.contains(part(host, 'label') as HTMLElement)).toBe(false)
  })
})

describe('radio group disabled cascades', () => {
  const withDisabled = async (): Promise<Updatable> => {
    document.body.innerHTML = `<helix-headless-radio-group label="L" name="c">
      <helix-headless-radio value="one">One</helix-headless-radio>
      <helix-headless-radio disabled value="two">Two</helix-headless-radio>
    </helix-headless-radio-group>`
    const host = document.body.firstElementChild as Updatable
    await settle(host)
    return host
  }

  test('a disabled group takes every choice with it', async () => {
    const host = (await withDisabled()) as Updatable & { disabled: boolean }
    host.disabled = true
    await settle(host)
    expect(
      options(host).map((item) => (item as unknown as { disabled: boolean }).disabled),
    ).toEqual([true, true])
  })

  test('enabling it gives each choice back its own answer', async () => {
    /* The latch, and the reason this is a util rather than a line.
       `item.disabled = group || item.disabled` writes `true` onto every item on
       the first pass, reads its own writing back as the item's own answer on
       the next, and leaves the whole set disabled for good. Nothing shows it
       until something re-enables a group, which is rare enough to ship. */
    const host = (await withDisabled()) as Updatable & { disabled: boolean }
    host.disabled = true
    await settle(host)
    host.disabled = false
    await settle(host)

    const state = options(host).map((item) => (item as unknown as { disabled: boolean }).disabled)
    expect(state).toEqual([false, true])
  })

  test('a choice disabled by the consumer afterwards stays its own', async () => {
    // Once the group has let go it stops holding a record, so a later change is
    // the consumer's and is left alone.
    const host = (await withDisabled()) as Updatable & { disabled: boolean }
    host.disabled = true
    await settle(host)
    host.disabled = false
    await settle(host)

    const first = at(options(host) as unknown as { disabled: boolean }[], 0)
    first.disabled = true
    await settle(host)
    expect(first.disabled).toBe(true)
  })
})

describe('radio group after a reset', () => {
  test('a reset forgets the failed attempt along with the answer', async () => {
    /* Submitting empty marks the field touched, which is what shows the
       message. A reset that kept the mark put "Choose one to continue." over
       the emptied group at once, before the reader had tried anything. */
    document.body.innerHTML = `<form><helix-headless-radio-group label="Label" name="r" required>
      <helix-headless-radio value="a">A</helix-headless-radio>
    </helix-headless-radio-group></form>`
    const host = document.querySelector('helix-headless-radio-group') as unknown as Updatable & {
      formResetCallback(): void
      internals: ElementInternals
      value: string
    }
    await settle(host)
    host.dispatchEvent(new Event('invalid'))
    host.value = 'a'
    await settle(host)
    host.formResetCallback()
    await settle(host)
    expect(host.value).toBe('')
    expect(host.internals.ariaInvalid).toBeNull()
  })
})

describe("radio group in the page's words", () => {
  test("a required group says what the page wrote, in the browser's bubble too", async () => {
    const host = (await group('required value-missing-message="Choisissez-en un."')) as unknown as {
      internals: ElementInternals
    }
    expect(host.internals.validationMessage).toBe('Choisissez-en un.')
  })
})
