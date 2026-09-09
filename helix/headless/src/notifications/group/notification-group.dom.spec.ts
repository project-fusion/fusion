import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Group = HTMLElement & {
  collapsible: boolean
  count?: number
  open: boolean
  total: number
  updateComplete: Promise<boolean>
}

const ROWS = `
  <helix-headless-notification>One</helix-headless-notification>
  <helix-headless-notification>Two</helix-headless-notification>
  <helix-headless-notification>Three</helix-headless-notification>`

const group = async (attributes = '', rows = ROWS): Promise<Group> =>
  (await mount(
    `<helix-headless-notification-group label="Today" ${attributes}>${rows}</helix-headless-notification-group>`,
  )) as Group

/**
 * A group is a named pile, and what makes a pile is the consumer's to decide.
 *
 * These say what the element owes: a name, a number, and a fold that removes
 * rows rather than hiding them.
 */
describe('what a group is called and how many it stands for', () => {
  test('it is a group and takes its name, not a landmark per day', async () => {
    const el = await group()
    expect(role(el)).toBe('group')
  })

  test('with no count, it stands for the rows it holds', async () => {
    expect((await group()).total).toBe(3)
  })

  /* A group saying five with one row under it and a link to the rest is the
     ordinary shape of a trimmed feed, and deriving the number from the children
     would make it unsayable. */
  test('with a count, it stands for that, which is usually more', async () => {
    const el = await group(
      'count="7"',
      '<helix-headless-notification>One</helix-headless-notification>',
    )
    expect(el.total).toBe(7)
  })
})

describe('folding', () => {
  test('no trigger until it is collapsible, because a control nobody asked for is still a tab stop', async () => {
    expect(part(await group(), 'trigger')).toBeNull()
    expect(part(await group('collapsible'), 'trigger')).not.toBeNull()
  })

  test('collapsible and open, so every row is assigned', async () => {
    const el = await group('collapsible open')
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    expect(slot?.assignedElements().length).toBe(3)
  })

  /* **Assigned nowhere, not hidden.** A row that is not assigned to a slot
     renders nothing at all, in both tiers, with no stylesheet: out of the
     layout, out of the tab order and out of the accessibility tree. */
  test('folded, so only the first is, and the rest render nothing at all', async () => {
    const el = await group('collapsible')
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    expect(slot?.assignedElements().length).toBe(1)
    expect(slot?.assignedElements()[0]?.textContent?.trim()).toBe('One')
  })

  /* One rather than none: a group folded to nothing is a heading with a number
     after it and no reason to believe there is anything behind it. */
  test('and never to nothing, because the one row is the evidence', async () => {
    const el = await group('collapsible')
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    expect(slot?.assignedElements().length).toBeGreaterThan(0)
  })

  test('the trigger says which way it is', async () => {
    expect(part(await group('collapsible'), 'trigger')?.getAttribute('aria-expanded')).toBe('false')
    expect(part(await group('collapsible open'), 'trigger')?.getAttribute('aria-expanded')).toBe(
      'true',
    )
  })

  test('pressing it unfolds, and every row arrives', async () => {
    const el = await group('collapsible')
    ;(part(el, 'trigger') as HTMLButtonElement | null)?.click()
    await el.updateComplete
    expect(hasState(el, 'open')).toBe(true)
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    expect(slot?.assignedElements().length).toBe(3)
  })

  /* Control is an action rather than a mode, which is the pattern every stateful
     component here answers to: a consumer takes the decision by refusing. */
  test('and refusing the request leaves it folded', async () => {
    const el = await group('collapsible')
    el.addEventListener('helix-before-open', (event) => event.preventDefault())
    ;(part(el, 'trigger') as HTMLButtonElement | null)?.click()
    await el.updateComplete
    expect(hasState(el, 'open')).toBe(false)
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    expect(slot?.assignedElements().length).toBe(1)
  })
})
