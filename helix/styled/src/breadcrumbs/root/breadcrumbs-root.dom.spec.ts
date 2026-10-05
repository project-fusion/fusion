import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets the two elements adopt, as text. happy-dom resolves no
   cascade, so what can be held here is that a rule exists rather than that it
   applied. The landmark, the list role, `current` and the anchor are the base
   tier's and are tested there. */
const sheet = (tag: 'helix-breadcrumb' | 'helix-breadcrumbs'): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector` in the crumb's sheet. */
const crumbRule = (selector: string): string =>
  sheet('helix-breadcrumb').split(`${selector} {`)[1]?.split('}')[0] ?? ''

const trail = `<helix-breadcrumbs aria-label="Breadcrumb">
  <helix-breadcrumb href="#home">Home</helix-breadcrumb>
  <helix-breadcrumb href="#design">Design</helix-breadcrumb>
  <helix-breadcrumb current>Breadcrumbs</helix-breadcrumb>
</helix-breadcrumbs>`

const crumbs = async (): Promise<{ host: HTMLElement; items: HTMLElement[] }> => {
  const host = await mount(trail)
  const items = [...host.querySelectorAll('helix-breadcrumb')] as HTMLElement[]
  for (const item of items) {
    await (item as Updatable).updateComplete
  }
  return { host, items }
}

describe('breadcrumbs', () => {
  test('the trail is a list whose markers the sheet removes and whose role the base tier keeps', async () => {
    /* Safari drops list semantics the moment it sees `list-style: none`, which
       is why the role is written out. The two are one decision in two tiers. */
    const { host } = await crumbs()
    expect(part(host, 'list')?.tagName).toBe('OL')
    expect(part(host, 'list')?.getAttribute('role')).toBe('list')
    expect(sheet('helix-breadcrumbs')).toContain('list-style: none')
    expect(sheet('helix-breadcrumbs')).toContain('flex-wrap: wrap')
  })

  test('every crumb draws its own separator, and the first hides it by position', async () => {
    // No crumb knows its index and the list coordinates nothing: `:first-child`
    // is the whole of it, and it is true in served markup before any script.
    const { items } = await crumbs()
    for (const item of items) {
      expect(part(item, 'separator')).not.toBeNull()
    }
    expect(crumbRule(':host(:first-child) [part="separator"]')).toContain('display: none')
  })

  test('a crumb is a link when it has somewhere to go, and the sheet takes the underline off', async () => {
    const { items } = await crumbs()
    expect(part(at(items, 0), 'link')?.tagName).toBe('A')
    expect(part(at(items, 2), 'link')?.tagName).toBe('SPAN')
    expect(crumbRule('[part="link"]')).toContain('text-decoration: none')
    expect(crumbRule('[part="link"]')).toContain(
      'color: var(--breadcrumbs-link-color, var(--helix-color-foreground-muted))',
    )
  })

  test('the current page reads as where you are, keyed on the attribute the base tier reflects', () => {
    expect(crumbRule(':host([current]) [part="link"]')).toContain(
      'color: var(--breadcrumbs-current-color, var(--helix-color-foreground))',
    )
  })

  test('a control slotted into a crumb is sized to the crumb, not to itself', () => {
    /* An icon button beside links of 28 took the control size, 40, and the row
       stepped around it. Both hooks are set from one measure, and the measure is
       `text * leading` rather than `1lh`, which resolves against whoever
       consumes it. */
    const host = crumbRule(':host')
    expect(host).toContain('--icon-button-size: var(')
    expect(host).toContain('--button-size: var(')
    expect(host).toContain('--breadcrumbs-control-size')
    expect(host).not.toContain('1lh')
  })

  test('the hooks the docs name are what the sheets read', () => {
    // A fallback written across lines keeps its line breaks in the sheet.
    expect(sheet('helix-breadcrumbs')).toMatch(/var\(\s*--breadcrumbs-gap,/)
    expect(sheet('helix-breadcrumbs')).toMatch(/var\(\s*--breadcrumbs-font-size,/)
    for (const hook of [
      '--breadcrumbs-control-padding-inline',
      '--breadcrumbs-control-size',
      '--breadcrumbs-current-color',
      '--breadcrumbs-font-weight',
      '--breadcrumbs-hover-color',
      '--breadcrumbs-link-color',
      '--breadcrumbs-radius',
      '--breadcrumbs-separator-color',
    ]) {
      expect(sheet('helix-breadcrumb')).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})
