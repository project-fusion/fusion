import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets an element adopts, as text: happy-dom resolves no cascade,
   so what is held here is that a rule exists. Roving, removal and selection
   are the base tier's and are tested there. */
const sheet = (tag: string): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('the styled tag group', () => {
  test('is the grid the base tier makes, holding styled tags', async () => {
    const group = (await mount(
      '<helix-tag-group label="Filters"><helix-tag>Open</helix-tag></helix-tag-group>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await group.updateComplete
    const internals = (group as unknown as { internals: ElementInternals }).internals
    expect(internals.role).toBe('grid')
  })

  test('wraps its tags, spaced by the hook it documents', () => {
    expect(sheet('helix-tag-group')).toContain('var(--tag-group-gap, var(--helix-space-2xs))')
  })

  /* A grouped tag's cell lays the content out as the host does and stretches
     over its padding, so the ring goes round the whole tag. */
  test('draws a grouped tag like a lone one, with the ring round all of it', () => {
    const tag = sheet('helix-tag')
    expect(tag).toContain('margin-inline: calc(var(--_tag-inset) * -1)')
    expect(tag).toContain('[part="cell"]:focus-visible')
    expect(tag).toContain(':host(:state(selected))')
  })
})

/* Every visual decision is a hook named after the family, defaulting to what
   was drawn before the hook existed. */
describe("the tag's hooks", () => {
  test('are read by the sheet, each with the old value as its fallback', () => {
    const declared = (customElements.get('helix-tag') as unknown as { styles: unknown }).styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const sheet = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return sheet.cssText ?? Array.from(sheet.cssRules ?? [], (rule) => rule.cssText).join('\n')
      })
      .join('\n')
      /* A formatter breaks a long fallback after `var(`. */
      .replace(/\(\s+/g, '(')
    for (const hook of ['--tag-font-weight', '--tag-gap']) {
      expect(text).toContain(`var(${hook},`)
    }
  })
})
