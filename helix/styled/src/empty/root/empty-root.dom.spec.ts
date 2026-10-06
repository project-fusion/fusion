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

/** The declarations of the first rule whose selector list names `selector`. */
const rule = (selector: string): string => {
  for (const block of sheet().split('}')) {
    const pieces = block.split('{')
    const head = pieces.at(-2) ?? ''
    if (head.split(',').some((one) => one.trim() === selector)) {
      return pieces.at(-1) ?? ''
    }
  }
  return ''
}

describe('empty', () => {
  test('stacks and centers what it is given, with room around it', () => {
    // An empty view is the only thing on screen, and crowded against the top
    // edge it reads as broken rather than empty.
    expect(rule(':host')).toContain('flex-direction: column')
    expect(rule(':host')).toContain('text-align: center')
    expect(rule(':host')).toContain('padding: var(--empty-padding, var(--helix-space-2xl))')
  })

  test('the icon takes the large step, so it moves with density', () => {
    expect(rule('slot[name="icon"]::slotted(*)')).toContain('var(--helix-size-icon-lg)')
  })

  test('the heading is the one thing at full strength', () => {
    const heading = rule('slot[name="heading"]::slotted(*)')
    expect(heading).toContain('var(--helix-color-foreground))')
    expect(heading).toContain('var(--helix-text-lg)')
    expect(rule('slot:not([name])')).toContain('var(--helix-color-foreground-muted)')
  })

  test('a heading drawn from words is set as a slotted one is', () => {
    expect(rule('[part="heading"]')).toBe(rule('slot[name="heading"]::slotted(*)'))
    expect(rule('[part="heading"]')).toContain('var(--helix-text-lg)')
  })

  test('the explanation runs to a measure a centered line can be read at', () => {
    // Centered text past about fifty characters loses the reader on the return sweep.
    expect(rule('slot:not([name])::slotted(*)')).toContain('46ch)')
  })

  test('carries no attribute of its own, and echoes the one the base tier reflects as written', async () => {
    const bare = await mount('<helix-empty>Nothing here.</helix-empty>')
    expect(bare.getAttributeNames()).toEqual([])
    const quiet = await mount('<helix-empty no-announce>Nothing here.</helix-empty>')
    expect(quiet.getAttributeNames()).toEqual(['no-announce'])
  })
})

/* One hook per visual decision, each falling back to the value it replaced,
   so a page can retune the block without reaching past its slots. */
describe('empty hooks', () => {
  test('the block, the icon, the heading, the message and the actions each take one', () => {
    expect(rule(':host')).toContain('gap: var(--empty-gap, var(--helix-space-sm))')
    const icon = rule('slot[name="icon"]::slotted(*)')
    expect(icon).toContain('--icon-size: var(--empty-icon-size, var(--helix-size-icon-lg))')
    expect(icon).toContain('color: var(--empty-icon-color, var(--helix-color-foreground-subtle))')
    const heading = rule('slot[name="heading"]::slotted(*)')
    expect(heading).toContain('color: var(--empty-heading-color, var(--helix-color-foreground))')
    expect(heading).toContain('font-size: var(--empty-heading-size, var(--helix-text-lg))')
    const message = rule('slot:not([name])')
    expect(message).toContain(
      'color: var(--empty-message-color, var(--helix-color-foreground-muted))',
    )
    expect(message).toContain('font-size: var(--empty-message-size, var(--helix-text-sm))')
    expect(rule('slot:not([name])::slotted(*)')).toContain(
      'max-inline-size: var(--empty-message-measure, 46ch)',
    )
    expect(rule('slot[name="actions"]::slotted(*)')).toContain(
      'margin-block-start: var(--empty-actions-gap, var(--helix-space-sm))',
    )
  })
})
