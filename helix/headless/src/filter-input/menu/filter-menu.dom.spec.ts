import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../menu/index.js')
  await import('../../option/index.js')
})

type Menu = HTMLElement & {
  updateComplete: Promise<unknown>
  valuesFor: (field: string) => readonly string[]
}

interface Facet {
  field: string
  label: string
  operator: string
  operatorLabel: string
  values: readonly string[]
}

const FIELD = `
  <helix-headless-filter-field name="disposition" label="Disposition">
    <helix-headless-filter-operator name="any" label="is any of" default></helix-headless-filter-operator>
    <helix-headless-filter-operator name="none" label="is none of"></helix-headless-filter-operator>
    <helix-headless-option value="refunded">Refunded</helix-headless-option>
    <helix-headless-option value="chargeback">Chargeback</helix-headless-option>
  </helix-headless-filter-field>`

const picker = async (inner = FIELD): Promise<Menu> => {
  const element = (await mount(
    `<helix-headless-filter-menu label="Filter">${inner}</helix-headless-filter-menu>`,
  )) as Menu
  await element.updateComplete
  return element
}

/* The rows this renders encode what they are in their `value`, so a spec can
   press one without reaching through the menu's own pages. */
const press = (element: Menu, kind: string, field: string, value = ''): void => {
  const selector =
    value === ''
      ? `[data-facet="${kind}"][data-field="${field}"]`
      : `[data-facet="${kind}"][data-field="${field}"][data-value="${value}"]`
  const row = element.shadowRoot?.querySelector(selector) as
    | (HTMLElement & { select?: () => void })
    | null
  row?.select?.()
}

const heard = (element: Menu): Facet[] => {
  const seen: Facet[] = []
  element.addEventListener('helix-facet', (event) => {
    seen.push((event as CustomEvent<Facet>).detail)
  })
  return seen
}

describe('what the picker reads', () => {
  test('the fields declared inside it, in order', async () => {
    const element = await picker(`${FIELD}
      <helix-headless-filter-field name="category" label="Category"></helix-headless-filter-field>`)
    expect(
      (element as unknown as { fields: Array<{ name?: string }> }).fields.map((one) => one.name),
    ).toEqual(['disposition', 'category'])
  })
})

describe('ticking a value', () => {
  test('announces the field, and nothing is applied until somebody does', async () => {
    const element = await picker()
    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.field).toBe('disposition')
    expect(seen[0]?.values).toEqual(['refunded'])
  })

  /* The whole set rather than the one value that moved: a consumer redrawing a
     chip from a single tick would have to keep their own copy of the rest. */
  test('a second tick announces both, not just the new one', async () => {
    const element = await picker()
    press(element, 'value', 'disposition', 'refunded')
    const seen = heard(element)
    press(element, 'value', 'disposition', 'chargeback')
    expect(seen[0]?.values).toEqual(['refunded', 'chargeback'])
  })

  test('and unticking takes it back out', async () => {
    const element = await picker()
    press(element, 'value', 'disposition', 'refunded')
    press(element, 'value', 'disposition', 'chargeback')
    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen[0]?.values).toEqual(['chargeback'])
  })

  /* Empty is a consumer's cue to drop the chip, so it is announced rather than
     swallowed. */
  test('unticking the last one announces an empty set', async () => {
    const element = await picker()
    press(element, 'value', 'disposition', 'refunded')
    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen[0]?.values).toEqual([])
  })
})

/**
 * The reason the picker decides the operator rather than the chip.
 *
 * A chip draws its operator segment only where `operator-label` is filled, so
 * whoever builds one has to know which of a field's comparisons is its usual.
 * That is the field's declaration, and this is the only thing that has read it.
 */
describe('which comparison it says is in force', () => {
  test('the default one, with no label, so a chip made from it stays plain', async () => {
    const element = await picker()
    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen[0]?.operator).toBe('any')
    expect(seen[0]?.operatorLabel).toBe('')
  })

  test('and any other one with its words, so the chip says so', async () => {
    const element = await picker()
    const seen = heard(element)
    press(element, 'operator', 'disposition', 'none')
    expect(seen[0]?.operator).toBe('none')
    expect(seen[0]?.operatorLabel).toBe('is none of')
  })

  test('a field with no default names its comparison every time', async () => {
    const element = await picker(`
      <helix-headless-filter-field name="created" label="Created">
        <helix-headless-filter-operator name="after" label="after"></helix-headless-filter-operator>
        <helix-headless-option value="today">Today</helix-headless-option>
      </helix-headless-filter-field>`)
    const seen = heard(element)
    press(element, 'value', 'created', 'today')
    expect(seen[0]?.operatorLabel).toBe('after')
  })
})

describe('refusing', () => {
  /* Control is an action rather than a mode: a consumer takes the decision for
     one interaction by refusing, and the picker must not be left holding a tick
     nobody accepted. */
  test('a refused tick is put back, so the menu keeps showing the truth', async () => {
    const element = await picker()
    element.addEventListener('helix-facet', (event) => event.preventDefault())
    press(element, 'value', 'disposition', 'refunded')
    expect(element.valuesFor('disposition')).toEqual([])
  })

  test('and a refused comparison goes back to the default', async () => {
    const element = await picker()
    element.addEventListener('helix-facet', (event) => event.preventDefault())
    press(element, 'operator', 'disposition', 'none')
    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen[0]?.operatorLabel).toBe('')
  })
})
