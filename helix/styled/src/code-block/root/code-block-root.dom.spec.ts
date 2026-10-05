import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-code-block') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('wrap, height and line numbers', () => {
  test('`wrap` wraps long lines anywhere, except under line numbers', () => {
    const wrapped = rule(':host([wrap]:not([diff], [line-numbers])) [part="code"]')
    expect(wrapped).toContain('white-space: pre-wrap')
    expect(wrapped).toContain('overflow-wrap: anywhere')
  })

  test('`wrap` reflects, so the sheet can reach it from a script', async () => {
    const block = (await mount('<helix-code-block>one</helix-code-block>')) as HTMLElement & {
      updateComplete: Promise<boolean>
      wrap: boolean
    }
    block.wrap = true
    await block.updateComplete
    expect(block.hasAttribute('wrap')).toBe(true)
  })

  test('the code grows to a hook and then scrolls, with no limit by default', () => {
    expect(rule(':host(:not([diff])) [part="code"]')).toContain(
      'max-block-size: var(--code-block-max-block-size, none)',
    )
  })

  test('the gutter sits beside the code in its face and line height', () => {
    expect(rule(':host([line-numbers]:not([diff])) [part="block"]')).toContain(
      'grid-template-columns: auto minmax(0, 1fr)',
    )
    const gutter = rule('[part="gutter"]')
    expect(gutter).toContain('font-family: var(--helix-font-mono)')
    expect(gutter).toContain('line-height: var(--helix-leading-normal)')
    expect(gutter).toContain('user-select: none')
    expect(gutter).toContain(
      'color: var(--code-block-gutter-color, var(--helix-color-foreground-subtle))',
    )
  })
})
