import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The toolbar role, the single tab stop and the arrow keys are the base tier's
   and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-toolbar') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const bar = `<helix-toolbar label="Text formatting">
  <button type="button">Bold</button>
  <button type="button">Italic</button>
</helix-toolbar>`

describe('toolbar', () => {
  test('the controls sit in a toolbar part, in a row or a column', async () => {
    expect(part(await mount(bar), 'toolbar')).not.toBeNull()
    expect(rule('[part="toolbar"]')).toContain('display: flex')
    expect(rule(':host([orientation="vertical"]) [part="toolbar"]')).toContain(
      'flex-direction: column',
    )
  })

  test('dense by nature: the control, icon, checkbox and tag steps are set once for everything inside', () => {
    /* A control put in here takes the small step without being told, so a row
       cannot end up with one member the wrong height. The icon step goes with
       it, or a 20px glyph sits in a 32px row. */
    const host = rule(':host')
    expect(host).toContain('--helix-size-control: var(--helix-size-control-sm)')
    expect(host).toContain('--helix-size-icon: var(--helix-size-icon-sm)')
    expect(host).toContain('--helix-size-checkbox: var(--helix-size-checkbox-sm)')
    expect(host).toContain('--helix-size-tag: var(--helix-size-tag-sm)')
    // And the loose and tight steps are derived from the new base, not left at
    // the page's.
    expect(host).toContain('--helix-size-control-loose: calc(var(--helix-size-control) * 1.2)')
    expect(host).toContain('--helix-size-icon-tight: calc(var(--helix-size-icon) * 0.8)')
  })

  test('no chrome of its own unless a hook asks for it', () => {
    // A toolbar is a place controls sit, and a border around them would be a
    // second frame inside whatever already frames the bar. Its edge, fill,
    // corner and inset are hooks that default to none.
    expect(rule('[part="toolbar"]')).toContain('border: var(--toolbar-border-width, 0) solid')
    expect(rule('[part="toolbar"]')).toContain(
      'background-color: var(--toolbar-background-color, transparent)',
    )
    expect(rule('[part="toolbar"]')).toContain(
      'border-radius: var(--toolbar-radius, var(--helix-radii-none))',
    )
    expect(rule('[part="toolbar"]')).toContain(
      'padding: var(--toolbar-padding, var(--helix-space-none))',
    )
  })

  test('the hook the docs name is what the sheet reads', () => {
    expect(rule('[part="toolbar"]')).toContain('gap: var(--toolbar-gap, var(--helix-space-2xs))')
  })

  test('carries no attribute of its own', async () => {
    expect((await mount(bar)).getAttributeNames()).toEqual(['label'])
  })
})
