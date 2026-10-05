import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the two elements adopt, as text. happy-dom resolves no
   cascade, so what can be held here is that a rule exists rather than that it
   applied. The list and item roles, `kind` and the anchor are the base tier's
   and are tested there. */
const sheet = (tag: 'helix-list' | 'helix-list-item'): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`, in either sheet. */
const rule = (tag: 'helix-list' | 'helix-list-item', selector: string): string =>
  sheet(tag).split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('list', () => {
  test('divided and marker reflect, and rest on nothing', async () => {
    const host = (await mount(
      '<helix-list label="Steps"><helix-list-item>One</helix-list-item></helix-list>',
    )) as Updatable & { divided: boolean; marker?: string }
    expect(host.hasAttribute('divided')).toBe(false)
    expect(host.hasAttribute('marker')).toBe(false)
    host.divided = true
    host.marker = 'rail'
    await host.updateComplete
    expect(host.hasAttribute('divided')).toBe(true)
    expect(host.getAttribute('marker')).toBe('rail')
  })

  test('a rule goes between rows and not around them', () => {
    // The first and last edges stay open, so the list reads as one object.
    expect(rule('helix-list', ':host([divided]) ::slotted(*:not(:first-child))')).toContain(
      'border-block-start: var(--helix-border-thin) solid var(--helix-color-border)',
    )
  })

  test("the markers are the platform's, hung outside into a gutter of our own", () => {
    /* Never `inside`: an inside marker is laid out as the first inline box
       within the principal box, and the next thing in that box is the row's
       grid, which put the row 23px below the item. */
    const list = sheet('helix-list')
    expect(rule('helix-list', ':host([kind="ordered"]) ::slotted(*)')).toContain(
      'list-style-type: decimal',
    )
    expect(rule('helix-list', ':host([kind="ordered"][type="i"]) ::slotted(*)')).toContain(
      'list-style-type: lower-roman',
    )
    expect(list).toContain('list-style-position: outside')
    expect(list).toContain('padding-inline-start: var(--list-marker-gutter, var(--helix-space-md))')
  })

  test('each list counts its own rows, whatever containment is above it', () => {
    /* The rows are numbered by the `list-item` counter, which, with no `<ol>`
       to own them, a size container above made one count for every list under
       it: four steps after three lists of three came out 10 to 13. */
    expect(rule('helix-list', ':host([kind="ordered"]),\n:host([kind="unordered"])')).toContain(
      'contain: style',
    )
  })

  test("the rail is the list's counter, handed to each row through two hooks", () => {
    /* Nothing in a row knows its own index, and the alternative is the list
       writing a number onto the consumer's markup, which a server and a client
       can disagree about. */
    const railed = rule('helix-list', ':host([marker="rail"]) ::slotted(*)')
    expect(railed).toContain(
      '--list-item-rail-content: counter(list-rail, var(--list-rail-style, decimal-leading-zero))',
    )
    expect(railed).toContain('--list-item-rail-display: block')
    expect(railed).toContain('counter-increment: list-rail')
    expect(rule('helix-list', ':host([marker="rail"]) ::slotted(*)')).not.toContain('list-style')
    // And the platform's marker goes when the rail arrives.
    expect(sheet('helix-list')).toContain(':host([kind="ordered"][marker="rail"]) ::slotted(*)')
  })

  test('a row always renders its rail cell and draws it only when the list says so', async () => {
    /* Absent and not empty: an empty box is free to layout and is not free to
       the native marker, which aligns to the first line box it can see. */
    const item = await mount('<helix-list-item>One</helix-list-item>')
    expect(part(item, 'rail')).not.toBeNull()
    expect(rule('helix-list-item', '[part="rail"]')).toContain(
      'display: var(--list-item-rail-display, none)',
    )
    expect(rule('helix-list-item', '[part="rail"]::before')).toContain(
      'content: var(--list-item-rail-content, "")',
    )
  })

  test('a row that navigates holds an anchor that does not look like one', async () => {
    const item = await mount('<helix-list-item href="#one">One</helix-list-item>')
    expect(part(item, 'link')?.tagName).toBe('A')
    expect(rule('helix-list-item', '[part="link"]')).toContain('text-decoration: none')
    expect(rule('helix-list-item', '[part="link"]')).toContain('color: inherit')
    /* The row's own tracks, so the link lines its regions up as a row with no
       link does, and leaves the fourth to `end`. */
    expect(rule('helix-list-item', '[part="link"]')).toContain('grid-template-columns: subgrid')
  })

  test('the hooks the docs name are what the sheets read', () => {
    for (const hook of ['--list-gap', '--list-marker-gutter', '--list-rail-style']) {
      expect(sheet('helix-list')).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
    for (const hook of [
      '--list-item-current-background-color',
      '--list-item-disabled-opacity',
      '--list-item-padding',
      '--list-item-rail-content',
      '--list-item-rail-display',
      '--list-item-selected-background-color',
      '--list-item-term-weight',
      '--list-rail-inline-size',
    ]) {
      expect(sheet('helix-list-item')).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })

  /* The `list-item` counter cannot be reset from the list, and `counter-set`
     on the first row moves it, measured in Chromium, where the markers read
     5, 6 for `start="5"` and 3, 2, 1 for a reversed list of three. */
  test('an ordered list counts from what its slot says, and the rail does too', () => {
    expect(rule('helix-list', ':host([kind="ordered"]) ::slotted(:first-child)')).toContain(
      'counter-set: list-item var(--list-first)',
    )
    expect(sheet('helix-list')).toContain('counter-increment: list-item var(--list-step, 1)')
    expect(rule('helix-list', ':host([marker="rail"]) ::slotted(:first-child)')).toContain(
      'counter-set: list-rail var(--list-first)',
    )
  })

  test('a current row and a selected row are drawn from their part and their state', () => {
    expect(rule('helix-list-item', '[part~="row-current"]')).toContain('background-color')
    expect(rule('helix-list-item', ':host(:state(selected)) [part~="row"]')).toContain(
      'background-color',
    )
    expect(rule('helix-list-item', '[part~="row"]:focus-visible')).toContain('outline')
  })
})
