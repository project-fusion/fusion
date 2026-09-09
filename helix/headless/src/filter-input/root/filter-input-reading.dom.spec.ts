import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The declared values are options, and an unregistered one never upgrades.
  await import('../../option/index.js')
  // The chips are what a dismissal comes from, so they have to upgrade too.
  await import('../chip/filter-chip.js')
  /* And the picker's rows are menu items: unregistered they are inert elements
     with no `select`, so a spec pressing one presses nothing and passes for the
     wrong reason. This file went green only while another spec had registered
     them first. */
  await import('../../menu/index.js')
})

/**
 * Enter reading the box against what was declared.
 *
 * The parse itself is checked in `grammar.pure.spec.ts`, which is where the
 * sentences live. What is here is the wiring either side of it: that Enter
 * reaches it at all, that what it read is announced as the picker would announce
 * it, that the text it read goes and the text it did not stays, and that a
 * refusal leaves the reader's own words where they put them.
 */

interface Facet {
  arity: 'many' | 'none' | 'one'
  field: string
  label: string
  operator: string
  operatorLabel: string
  values: readonly string[]
}

const control = (host: Updatable): HTMLInputElement =>
  part(host as HTMLElement, 'control') as HTMLInputElement

const type = async (host: Updatable, text: string): Promise<void> => {
  const field = control(host)
  field.value = text
  field.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
  await settle(host)
}

const press = async (host: Updatable, key = 'Enter'): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  control(host).dispatchEvent(event)
  await settle(host)
  return event
}

/** Written the way a consumer writes it: the fields live inside the picker. */
const FIELDS = `
  <helix-headless-filter-menu label="Filter" slot="start">
    <helix-headless-filter-field name="disposition" label="Disposition">
      <helix-headless-option value="refunded">Refunded</helix-headless-option>
      <helix-headless-option value="settled">Settled</helix-headless-option>
    </helix-headless-filter-field>
    <helix-headless-filter-field name="created" label="Created"></helix-headless-filter-field>
  </helix-headless-filter-menu>`

const mount = async (inner = FIELDS): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-filter-input label="Filter rows">${inner}</helix-headless-filter-input>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

/** Every facet the field announced, in order. */
const watch = (host: Updatable, refuse = false): Facet[] => {
  const heard: Facet[] = []
  host.addEventListener('helix-facet', (event) => {
    heard.push((event as CustomEvent<Facet>).detail)
    if (refuse) {
      event.preventDefault()
    }
  })
  return heard
}

describe('reading the box', () => {
  test('Enter announces what was typed, as the picker would have', async () => {
    const host = await mount()
    const heard = watch(host)
    await type(host, 'disposition:refunded,settled')
    await press(host)
    expect(heard).toEqual([
      {
        arity: 'many',
        field: 'disposition',
        label: 'Disposition',
        operator: 'any',
        operatorLabel: '',
        values: ['refunded', 'settled'],
      },
    ])
  })

  test('the text it read goes, and the text it did not stays', async () => {
    const host = await mount()
    watch(host)
    await type(host, 'refund disposition:settled')
    await press(host)
    expect((host as unknown as { value: string }).value).toBe('refund')
    expect(control(host).value).toBe('refund')
  })

  test('a filter Enter took is not the form submitting as well', async () => {
    const host = await mount()
    watch(host)
    await type(host, 'disposition:settled')
    expect((await press(host)).defaultPrevented).toBe(true)
  })

  test('Enter over text that is only text is still the form’s', async () => {
    const host = await mount()
    const heard = watch(host)
    await type(host, 'refund tuesday')
    expect((await press(host)).defaultPrevented).toBe(false)
    expect(heard).toHaveLength(0)
    expect(control(host).value).toBe('refund tuesday')
  })

  test('a refused facet leaves the words that made it where they were', async () => {
    const host = await mount()
    const heard = watch(host, true)
    await type(host, 'refund disposition:settled')
    await press(host)
    expect(heard).toHaveLength(1)
    expect(control(host).value).toBe('refund disposition:settled')
  })

  test('one refused beside one taken puts back only the refused one', async () => {
    const host = await mount()
    const heard: Facet[] = []
    host.addEventListener('helix-facet', (event) => {
      const facet = (event as CustomEvent<Facet>).detail
      heard.push(facet)
      if (facet.field === 'created') {
        event.preventDefault()
      }
    })
    await type(host, 'disposition:settled created:today refund')
    await press(host)
    expect(heard.map((facet) => facet.field)).toEqual(['disposition', 'created'])
    expect(control(host).value).toBe('created:today refund')
  })

  test('nothing declared parses nothing, which is what this was before', async () => {
    const host = await mount('')
    const heard = watch(host)
    await type(host, 'disposition:settled')
    expect((await press(host)).defaultPrevented).toBe(false)
    expect(heard).toHaveLength(0)
    expect(control(host).value).toBe('disposition:settled')
  })

  /* One store, or the two surfaces drift: a filter typed here that the picker
     never heard about leaves the value unticked in a list about to be opened,
     and the reader's next press on it reads as unticking something they can
     see in a chip. */
  test('what was typed is ticked in the picker, not announced past it', async () => {
    const host = await mount()
    watch(host)
    await type(host, 'disposition:refunded,settled')
    await press(host)
    const menu = (host as HTMLElement).querySelector('helix-headless-filter-menu') as unknown as {
      valuesFor: (field: string) => readonly string[]
    }
    expect(menu.valuesFor('disposition')).toEqual(['refunded', 'settled'])
  })

  test('and a typed negation is the comparison the picker now shows', async () => {
    const host = await mount()
    const heard = watch(host)
    await type(host, '-disposition:refunded')
    await press(host)
    const menu = (host as HTMLElement).querySelector('helix-headless-filter-menu') as unknown as {
      fields: HTMLElement[]
      operatorFor: (field: HTMLElement) => { name: string } | null
    }
    expect(heard[0]?.operator).toBe('none')
    expect(menu.operatorFor(menu.fields[0] as HTMLElement)?.name).toBe('none')
  })
})

describe('a chip asking to go', () => {
  const chipFor = async (host: Updatable, field: string): Promise<HTMLElement> => {
    const chip = document.createElement('helix-headless-filter-chip')
    chip.setAttribute('name', field)
    chip.setAttribute('dismissible', '')
    chip.slot = 'tags'
    ;(host as HTMLElement).append(chip)
    await settle(host)
    return chip
  }

  test('is answered as the filter going, so the picker unticks with the chip', async () => {
    const host = await mount()
    const menu = (host as HTMLElement).querySelector('helix-headless-filter-menu') as unknown as {
      apply: (field: string, values: readonly string[]) => boolean
      valuesFor: (field: string) => readonly string[]
    }
    menu.apply('disposition', ['refunded'])
    const chip = await chipFor(host, 'disposition')
    const heard = watch(host)

    ;(chip as unknown as { dismiss: () => boolean }).dismiss()
    await settle(host)
    expect(heard).toHaveLength(1)
    expect(heard[0]?.values).toEqual([])
    expect(menu.valuesFor('disposition')).toEqual([])
  })

  /* The bug this closes: the chip went and the menu did not hear, so the value
     stayed ticked and pressing it again *unticked* it. The reader pressed
     `Refunded` and nothing came back. */
  test('and ticking that value again brings the filter back', async () => {
    const host = await mount()
    const element = (host as HTMLElement).querySelector(
      'helix-headless-filter-menu',
    ) as HTMLElement & {
      apply: (field: string, values: readonly string[]) => boolean
    }
    /* Through the row rather than through `apply`, because the row is what
       toggles and the toggle is the whole bug: with the menu still holding a
       tick nobody can see, pressing the value *unticks* it and the reader gets
       an empty set back for a press that should have filtered. */
    const row = (): (HTMLElement & { checked: boolean; select: () => void }) | null =>
      element.shadowRoot?.querySelector(
        '[data-facet="value"][data-field="disposition"][data-value="refunded"]',
      ) as (HTMLElement & { checked: boolean; select: () => void }) | null

    element.apply('disposition', ['refunded'])
    const chip = await chipFor(host, 'disposition')
    ;(chip as unknown as { dismiss: () => boolean }).dismiss()
    await settle(host)
    // The rows are the menu's render, so they are there once its update has run.
    await (element as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(row()).not.toBeNull()
    expect(row()?.checked).toBe(false)

    const heard = watch(host)
    row()?.select()
    expect(heard[0]?.values).toEqual(['refunded'])
  })

  test('a token naming no declared field is still the consumer’s to answer', async () => {
    const host = await mount()
    const tag = document.createElement('helix-headless-filter-chip')
    tag.setAttribute('name', 'assignee')
    tag.slot = 'tags'
    ;(host as HTMLElement).append(tag)
    await settle(host)

    let asked = 0
    host.addEventListener('helix-dismiss', () => {
      asked += 1
    })
    ;(tag as unknown as { dismiss: () => boolean }).dismiss()
    await settle(host)
    expect(asked).toBe(1)
  })
})

describe('the rest of the reading', () => {
  test('the negation is there without anybody declaring it', async () => {
    const host = await mount()
    const heard = watch(host)
    await type(host, '-disposition:refunded')
    await press(host)
    expect(heard[0]?.operator).toBe('none')
    expect(heard[0]?.operatorLabel).toBe('is none of')
  })
})
