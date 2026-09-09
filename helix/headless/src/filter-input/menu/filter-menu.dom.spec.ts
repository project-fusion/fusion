import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../menu/index.js')
  await import('../../option/index.js')
})

type Menu = HTMLElement & {
  apply: (field: string, values: readonly string[], operator?: string) => boolean
  fields: HTMLElement[]
  operatorFor: (field: HTMLElement) => { default: boolean; label: string; name: string } | null
  updateComplete: Promise<unknown>
  valuesFor: (field: string) => readonly string[]
}

interface Facet {
  arity: 'many' | 'none' | 'one'
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

  test('a field that declares none is offered the two the grammar can type', async () => {
    const element = await picker(`
      <helix-headless-filter-field name="disposition" label="Disposition">
        <helix-headless-option value="refunded">Refunded</helix-headless-option>
      </helix-headless-filter-field>`)
    const rows = [
      ...(element.shadowRoot?.querySelectorAll<HTMLElement>(
        '[data-facet="operator"][data-field="disposition"]',
      ) ?? []),
    ]
    expect(rows.map((row) => row.dataset.value)).toEqual(['any', 'none'])

    const seen = heard(element)
    press(element, 'value', 'disposition', 'refunded')
    expect(seen[0]?.operator).toBe('any')
    expect(seen[0]?.operatorLabel).toBe('')

    press(element, 'operator', 'disposition', 'none')
    expect(seen[1]?.operator).toBe('none')
    expect(seen[1]?.operatorLabel).toBe('is none of')
  })

  /* Flat, the comparison and the values were rows drawn the same way, and a
     reader had nothing to tell a single choice from a several. What separates
     them is structure rather than styling, so it is checkable here. */
  test('the comparisons sit under a row of their own, not beside the values', async () => {
    const element = await picker()
    const at = (selector: string): HTMLElement[] => [
      ...(element.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []),
    ]
    const comparison = at('[data-facet="comparison"]')[0] ?? null
    expect(comparison).not.toBeNull()
    // A way in rather than a choice: it opens a page and never takes a tick.
    expect(comparison?.hasAttribute('checkable')).toBe(false)

    const operators = at('[data-facet="operator"]')
    expect(operators).toHaveLength(2)
    expect(operators.map((row) => row.parentElement)).toEqual([comparison, comparison])

    // And the values stay a level up, under the field and beside nothing else.
    const values = at('[data-facet="value"]')
    expect(values).toHaveLength(2)
    expect(values.map((row) => row.parentElement?.getAttribute('data-facet'))).toEqual([
      'field',
      'field',
    ])
  })

  /* The rule is what makes the page two groups rather than one list that
     changes halfway down: one comparison above it, any number of values below.
     `Menu` paints a slotted divider on a submenu page only since the fix in
     `MenuItem`, which is where the leak this would have shown is covered. */
  test('a rule separates the comparison from the values', async () => {
    const element = await picker()
    const rows = [
      ...(element.shadowRoot?.querySelectorAll(
        '[data-facet="comparison"], helix-headless-divider, [data-facet="value"]',
      ) ?? []),
    ].map((row) => (row as HTMLElement).dataset.facet ?? row.localName)
    expect(rows).toEqual(['comparison', 'helix-headless-divider', 'value', 'value'])
  })

  test('and no rule where there is no comparison to separate', async () => {
    const element = await picker(`
      <helix-headless-filter-field name="created" label="Created">
        <helix-headless-filter-operator name="after" label="after"></helix-headless-filter-operator>
        <helix-headless-option value="today">Today</helix-headless-option>
      </helix-headless-filter-field>`)
    expect(element.shadowRoot?.querySelector('helix-headless-divider')).toBeNull()
  })

  test('nor where the field lists no values for one to sit above', async () => {
    const element = await picker(`
      <helix-headless-filter-field name="assignee" label="Assignee"></helix-headless-filter-field>`)
    expect(element.shadowRoot?.querySelector('[data-facet="comparison"]')).not.toBeNull()
    expect(element.shadowRoot?.querySelector('helix-headless-divider')).toBeNull()
  })

  test('a field with one comparison offers no way in at all', async () => {
    const element = await picker(`
      <helix-headless-filter-field name="created" label="Created">
        <helix-headless-filter-operator name="after" label="after"></helix-headless-filter-operator>
        <helix-headless-option value="today">Today</helix-headless-option>
      </helix-headless-filter-field>`)
    expect(element.shadowRoot?.querySelector('[data-facet="comparison"]')).toBeNull()
  })
})

/**
 * How many values a comparison takes, and what the picker does about it.
 *
 * `FilterOperator` calls `arity` "a fact the picker uses to decide what to
 * offer", and for two releases it decided nothing: `is empty` was offered a page
 * of names to tick and a scalar comparison let a reader pick three dates.
 */
describe('a comparison that takes no values', () => {
  const EMPTY = `
    <helix-headless-filter-field name="assignee" label="Assignee">
      <helix-headless-filter-operator name="any" label="is any of" default></helix-headless-filter-operator>
      <helix-headless-filter-operator name="empty" label="is empty" arity="none"></helix-headless-filter-operator>
      <helix-headless-option value="ada">Ada</helix-headless-option>
      <helix-headless-option value="grace">Grace</helix-headless-option>
    </helix-headless-filter-field>`

  test('offers none, because ticking one could not mean anything', async () => {
    const element = await picker(EMPTY)
    expect(element.shadowRoot?.querySelectorAll('[data-facet="value"]')).toHaveLength(2)
    press(element, 'operator', 'assignee', 'empty')
    await element.updateComplete
    expect(element.shadowRoot?.querySelectorAll('[data-facet="value"]')).toHaveLength(0)
  })

  test('and takes back anything already ticked, which is now untrue', async () => {
    const element = await picker(EMPTY)
    press(element, 'value', 'assignee', 'ada')
    const seen = heard(element)
    press(element, 'operator', 'assignee', 'empty')
    expect(seen[0]?.values).toEqual([])
    expect(element.valuesFor('assignee')).toEqual([])
  })

  /* The whole reason `arity` is in the detail: this facet and a cleared one are
     otherwise the same event, and a consumer would drop the chip for both. */
  test('says so in the facet, so an empty filter is not read as no filter', async () => {
    const element = await picker(EMPTY)
    const seen = heard(element)
    press(element, 'operator', 'assignee', 'empty')
    expect(seen[0]?.arity).toBe('none')
    expect(seen[0]?.operatorLabel).toBe('is empty')
    expect(seen[0]?.values).toEqual([])
  })

  test('and the values come back when a comparison that takes them does', async () => {
    const element = await picker(EMPTY)
    press(element, 'operator', 'assignee', 'empty')
    await element.updateComplete
    const seen = heard(element)
    press(element, 'operator', 'assignee', 'any')
    await element.updateComplete
    expect(element.shadowRoot?.querySelectorAll('[data-facet="value"]')).toHaveLength(2)
    expect(seen[0]?.arity).toBe('many')
  })
})

describe('a comparison that takes one value', () => {
  const SCALAR = `
    <helix-headless-filter-field name="created" label="Created">
      <helix-headless-filter-operator name="after" label="is after" arity="one"></helix-headless-filter-operator>
      <helix-headless-option value="today">Today</helix-headless-option>
      <helix-headless-option value="week">This week</helix-headless-option>
    </helix-headless-filter-field>`

  test('pressing another replaces it, since after two dates is not a filter', async () => {
    const element = await picker(SCALAR)
    press(element, 'value', 'created', 'today')
    const seen = heard(element)
    press(element, 'value', 'created', 'week')
    expect(seen[0]?.values).toEqual(['week'])
    expect(element.valuesFor('created')).toEqual(['week'])
  })

  test('and pressing the one already on takes it off, which is how it clears', async () => {
    const element = await picker(SCALAR)
    press(element, 'value', 'created', 'today')
    const seen = heard(element)
    press(element, 'value', 'created', 'today')
    expect(seen[0]?.values).toEqual([])
  })

  test('its rows are one of a set, and say so', async () => {
    const element = await picker(SCALAR)
    for (const row of element.shadowRoot?.querySelectorAll('[data-facet="value"]') ?? []) {
      expect(row.hasAttribute('exclusive')).toBe(true)
    }
  })
})

describe('applying a filter from somewhere else', () => {
  test('announces it and holds the ticks, so the menu shows what is in force', async () => {
    const element = await picker()
    const seen = heard(element)
    expect(element.apply('disposition', ['refunded', 'chargeback'])).toBe(true)
    expect(seen[0]?.values).toEqual(['refunded', 'chargeback'])
    expect(element.valuesFor('disposition')).toEqual(['refunded', 'chargeback'])
  })

  test('an empty set is the filter going, and the ticks go with it', async () => {
    const element = await picker()
    element.apply('disposition', ['refunded'])
    const seen = heard(element)
    expect(element.apply('disposition', [])).toBe(true)
    expect(seen[0]?.values).toEqual([])
    expect(element.valuesFor('disposition')).toEqual([])
  })

  test('it can name the comparison too, which is what a typed minus does', async () => {
    const element = await picker()
    const seen = heard(element)
    element.apply('disposition', ['refunded'], 'none')
    expect(seen[0]?.operator).toBe('none')
    expect(seen[0]?.operatorLabel).toBe('is none of')
  })

  test('refused, and everything goes back rather than the menu saying it took', async () => {
    const element = await picker()
    element.apply('disposition', ['refunded'])
    element.addEventListener('helix-facet', (event) => {
      event.preventDefault()
    })
    expect(element.apply('disposition', ['settled'], 'none')).toBe(false)
    expect(element.valuesFor('disposition')).toEqual(['refunded'])
    expect(element.operatorFor(element.fields[0] as never)?.name).toBe('any')
  })

  /* Held, the comparison was invisible: the chip was gone and the reader's next
     tick quietly came back `is none of`. Naming one is the other case, a reader
     choosing a comparison before ticking anything, and that stands. */
  test('an empty set with no comparison named puts the field back to its usual one', async () => {
    const element = await picker()
    element.apply('disposition', ['refunded'], 'none')
    expect(element.operatorFor(element.fields[0] as never)?.name).toBe('none')
    element.apply('disposition', [])
    expect(element.operatorFor(element.fields[0] as never)?.name).toBe('any')
  })

  test('but naming one holds it, for a reader who picks before they tick', async () => {
    const element = await picker()
    element.apply('disposition', [], 'none')
    expect(element.operatorFor(element.fields[0] as never)?.name).toBe('none')
  })

  test('the comparisons are one of a set, and say so', async () => {
    const element = await picker()
    for (const row of element.shadowRoot?.querySelectorAll('[data-facet="operator"]') ?? []) {
      expect(row.hasAttribute('exclusive')).toBe(true)
    }
  })

  test('a field nobody declared is not one this can filter by', async () => {
    const element = await picker()
    const seen = heard(element)
    expect(element.apply('assignee', ['ada'])).toBe(false)
    expect(seen).toHaveLength(0)
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
