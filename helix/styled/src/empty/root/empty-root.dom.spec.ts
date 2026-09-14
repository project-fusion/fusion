import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The announcement and the four slots are the base tier's and are tested
   there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-empty') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('empty', () => {
  test('stacks and centers what it is given, with room around it', () => {
    // An empty view is the only thing on screen, and crowded against the top
    // edge it reads as broken rather than empty.
    expect(rule(':host')).toContain('flex-direction: column')
    expect(rule(':host')).toContain('text-align: center')
    expect(rule(':host')).toContain('padding: var(--empty-padding, var(--helix-space-2xl))')
  })

  test('the icon takes the large step, so it moves with density', () => {
    expect(rule('slot[name="icon"]::slotted(*)')).toContain(
      '--icon-size: var(--helix-size-icon-lg)',
    )
  })

  test('the heading is the one thing at full strength', () => {
    const heading = rule('slot[name="heading"]::slotted(*)')
    expect(heading).toContain('color: var(--helix-color-foreground)')
    expect(heading).toContain('font-size: var(--helix-text-lg)')
    expect(rule('slot:not([name])')).toContain('color: var(--helix-color-foreground-muted)')
  })

  test('the explanation runs to a measure a centered line can be read at', () => {
    // Centered text past about fifty characters loses the reader on the return sweep.
    expect(rule('slot:not([name])::slotted(*)')).toContain('max-inline-size: 46ch')
  })

  test('carries no attribute of its own, and echoes the one the base tier reflects as written', async () => {
    const bare = await mount('<helix-empty>Nothing here.</helix-empty>')
    expect(bare.getAttributeNames()).toEqual([])
    const quiet = await mount('<helix-empty no-announce>Nothing here.</helix-empty>')
    expect(quiet.getAttributeNames()).toEqual(['no-announce'])
  })
})
