import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

type Field = HTMLElement & {
  defaultOperator: { name?: string } | null
  operators: { name?: string }[]
  values: { value: string }[]
}

const field = async (inner: string): Promise<Field> =>
  (await mount(
    `<helix-headless-filter-field name="disposition" label="Disposition">${inner}</helix-headless-filter-field>`,
  )) as Field

const OPERATORS = `
  <helix-headless-filter-operator name="any" label="is any of" default></helix-headless-filter-operator>
  <helix-headless-filter-operator name="none" label="is none of"></helix-headless-filter-operator>`

/**
 * A field is a declaration, so what it owes is an answer rather than a picture.
 *
 * It renders nothing at all, which is the mechanism that keeps a schema written
 * in markup off the page, and everything a picker needs it reads back off the
 * light DOM.
 */
describe('a field declares and never draws', () => {
  test('it renders nothing, so what a consumer writes inside it is never painted', async () => {
    const el = await field(OPERATORS)
    expect(el.shadowRoot?.querySelector('slot')).toBeNull()
    expect(el.shadowRoot?.childElementCount ?? 0).toBe(0)
  })

  test('the comparisons come back in the order they were written', async () => {
    const el = await field(OPERATORS)
    expect(el.operators.map((operator) => operator.name)).toEqual(['any', 'none'])
  })

  /* Order is the consumer's, and it is the order a chooser should offer them
     in, so it is asserted rather than assumed. */
  test('and reversing the markup reverses the answer', async () => {
    const el = await field(`
      <helix-headless-filter-operator name="none" label="is none of"></helix-headless-filter-operator>
      <helix-headless-filter-operator name="any" label="is any of" default></helix-headless-filter-operator>`)
    expect(el.operators.map((operator) => operator.name)).toEqual(['none', 'any'])
  })

  test('the values come back too, as the Options a consumer already has', async () => {
    const el = await field(`
      ${OPERATORS}
      <helix-headless-option value="refunded">Refunded</helix-headless-option>
      <helix-headless-option value="chargeback">Chargeback</helix-headless-option>`)
    expect(el.values.map((option) => option.value)).toEqual(['refunded', 'chargeback'])
  })
})

describe('the comparison a chip leaves unwritten', () => {
  test('the one marked default', async () => {
    const el = await field(OPERATORS)
    expect(el.defaultOperator?.name).toBe('any')
  })

  /* A field whose comparisons are all equally surprising has no usual one, and
     every chip built from it spells its operator out. */
  test('and nothing where none is marked, which is a field with no usual comparison', async () => {
    const el = await field(
      '<helix-headless-filter-operator name="after" label="after"></helix-headless-filter-operator>',
    )
    expect(el.defaultOperator).toBeNull()
  })

  /* Two defaults is a consumer saying two different things. Picking one quietly
     would draw a chip whose operator is missing and whose meaning is not the one
     they wrote, so it is reported. */
  test('two defaults are reported rather than resolved silently', async () => {
    const said: string[] = []
    const warn = console.warn
    console.warn = (message: string) => said.push(message)
    try {
      const el = await field(`
        <helix-headless-filter-operator name="any" label="is any of" default></helix-headless-filter-operator>
        <helix-headless-filter-operator name="all" label="has all of" default></helix-headless-filter-operator>`)
      expect(el.defaultOperator?.name).toBe('any')
    } finally {
      console.warn = warn
    }
    expect(said.length).toBe(1)
    expect(said[0]).toContain('disposition')
  })
})
