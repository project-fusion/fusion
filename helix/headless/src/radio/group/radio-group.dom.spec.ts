import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, part, registerDom, type Updatable } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const settle = async (host: Updatable): Promise<void> => {
  while ((await host.updateComplete) === false) {
    // Validity moves outside the property system, so this takes two passes.
  }
}

const group = async (extra = '', chosen = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-base-radio-group label="Label" name="choice" ${extra} default-value="${chosen}">
    <helix-base-radio value="one">One</helix-base-radio>
    <helix-base-radio value="two">Two</helix-base-radio>
    <helix-base-radio value="three">Three</helix-base-radio>
  </helix-base-radio-group>`
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
    host.addEventListener('helix-change', (event) => event.preventDefault())
    ;(options(host)[1] as unknown as { select: () => void }).select()
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

  test('an empty group is still reachable by tab', async () => {
    // Every item at `tabindex="-1"` is a group the keyboard cannot enter, which
    // is what a roving index does when nothing has been chosen yet.
    const host = await group()
    const first = part(options(host)[0] as HTMLElement, 'item') as HTMLElement
    expect(options(host)[0]?.getAttribute('tabindex')).toBe('0')
    expect(first).not.toBeNull()
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
    document.body.innerHTML = `<helix-base-radio-group label="L" name="c">
      <helix-base-radio value="one">One</helix-base-radio>
      <helix-base-radio disabled value="two">Two</helix-base-radio>
    </helix-base-radio-group>`
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

    const [first] = options(host) as unknown as { disabled: boolean }[]
    first.disabled = true
    await settle(host)
    expect(first.disabled).toBe(true)
  })
})
