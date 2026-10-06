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
    expect(gutter).toContain('font-family: var(--_code-block-face)')
    expect(gutter).toContain('font-size: var(--_code-block-size)')
    expect(gutter).toContain('line-height: var(--_code-block-leading)')
    expect(gutter).toContain('user-select: none')
    expect(gutter).toContain(
      'color: var(--code-block-gutter-color, var(--helix-color-foreground-subtle))',
    )
  })
})

/* The code's color and type, the name's color and a diff's two tints were
   fixed, so a block on a page with its own code face could not take it. */
describe('hooks', () => {
  test('the code and its numbers share one type, each part a hook on the token it was', () => {
    const host = rule(':host')
    expect(host).toContain('--_code-block-size: var(--code-block-font-size, var(--helix-text-sm))')
    expect(host).toContain(
      '--_code-block-leading: var(--code-block-line-height, var(--helix-leading-normal))',
    )
    expect(host).toContain(
      '--_code-block-face: var(--code-block-font-family, var(--helix-font-mono))',
    )
    expect(host).toContain(
      '--_code-block-line: calc(var(--_code-block-size) * var(--_code-block-leading))',
    )
    const code = rule('[part="code"]')
    expect(code).toContain('color: var(--code-block-color, var(--helix-color-foreground))')
    expect(code).toContain('font-family: var(--_code-block-face)')
  })

  test("the name and a diff's two tints are hooks on the colors they were", () => {
    expect(rule('[part="label"]')).toContain(
      'color: var(--code-block-label-color, var(--helix-color-foreground-muted))',
    )
    expect(rule('[part="added"]')).toContain(
      'var(--code-block-added-color, var(--helix-color-success)) 14%',
    )
    expect(rule('[part="removed"]')).toContain(
      'var(--code-block-removed-color, var(--helix-color-danger)) 14%',
    )
  })
})
