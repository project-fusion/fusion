import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Operator = HTMLElement & {
  arity?: 'many' | 'none' | 'one'
  default: boolean
  label: string
  name?: string
}

const operator = async (attributes = '', inner = 'is any of'): Promise<Operator> =>
  (await mount(
    `<helix-headless-filter-operator ${attributes}>${inner}</helix-headless-filter-operator>`,
  )) as Operator

/**
 * A comparison is a declaration, and the whole of what it owes is to be read
 * and never seen.
 *
 * **Thin on purpose.** What a comparison *means* is exercised by the field that
 * holds it and the menu that offers it, both of which have specs of their own,
 * and copying those here would prove nothing they did not. What is left is this
 * element's own contract: it draws nothing, it announces nothing to a screen
 * reader, and the four facts a picker reads off it come back as written.
 */
describe('a comparison declares and never draws', () => {
  test('it renders no slot, so the words a consumer writes inside are never painted', async () => {
    /* The mechanism, and it costs no `display: none` in a tier with no
       stylesheet to put one in: an element that renders no slot renders none of
       its children. Asserted on the shadow root, because the light DOM holds
       the words either way. */
    const el = await operator('name="any" label="is any of"')
    expect(el.shadowRoot?.querySelector('slot')).toBeNull()
    expect(el.shadowRoot?.childElementCount ?? 0).toBe(0)
  })

  test('and it is nothing in the accessibility tree, because it is never on the page', async () => {
    // Not a `listitem`, not an `option`, not anything. The menu that offers
    // these renders its own rows, and a second set of semantics here would put
    // a reader through the schema as well as through the choices.
    expect(role(await operator('name="any" label="is any of"'))).toBe('none')
  })
})

/**
 * The four facts a picker reads, and the two readings that are not the value
 * written.
 */
describe('what a comparison says about itself', () => {
  test('the name and the label are two different audiences and both survive', async () => {
    /* `label` is what a reader sees and translates; `name` is what the
       consumer's own model calls the comparison and does not. A chip matched on
       the words would stop matching the first time the page changed language. */
    const el = await operator('name="none" label="is none of"')
    expect(el.name).toBe('none')
    expect(el.label).toBe('is none of')
  })

  test('an undeclared arity is undefined here, and the field is what reads it as `many`', async () => {
    /* Undefined rather than defaulted, which is the rule every reflected
       property in this family answers to: a default writes an attribute on
       upgrade that the server never wrote. The reading happens in
       `vocabulary`, which is the one place it happens. */
    const el = await operator('name="any" label="is any of"')
    expect(el.arity).toBeUndefined()
    expect(el.hasAttribute('arity')).toBe(false)
  })

  test('and a declared one comes back as declared', async () => {
    expect((await operator('name="empty" label="is empty" arity="none"')).arity).toBe('none')
    expect((await operator('name="after" label="is after" arity="one"')).arity).toBe('one')
  })

  /* A boolean, so its absence is false rather than undefined: a field asks
     which of its comparisons is the usual one and every answer has to be yes or
     no. */
  test('the default is a boolean, and absent means this is not the usual comparison', async () => {
    expect((await operator('name="any" label="is any of" default')).default).toBe(true)
    expect((await operator('name="none" label="is none of"')).default).toBe(false)
  })
})
