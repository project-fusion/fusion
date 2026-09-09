import { beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The declared values are options, and an unregistered one never upgrades.
  await import('../../option/index.js')
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

  test('the negation is there without anybody declaring it', async () => {
    const host = await mount()
    const heard = watch(host)
    await type(host, '-disposition:refunded')
    await press(host)
    expect(heard[0]?.operator).toBe('none')
    expect(heard[0]?.operatorLabel).toBe('is none of')
  })
})
