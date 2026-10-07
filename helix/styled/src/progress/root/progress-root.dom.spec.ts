import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-progress') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

/* Forced colors painted the track and the fill the same Canvas white, so a bar
   at 50 showed no progress at all in Windows High Contrast. */
describe('in forced colors', () => {
  test('the fill keeps the system Highlight and the track is outlined', () => {
    const forced = sheet().split('@media (forced-colors: active)')[1] ?? ''
    const fill = forced.split('[part="indicator"] {')[1]?.split('}')[0] ?? ''
    const track = forced.split('[part="track"] {')[1]?.split('}')[0] ?? ''
    expect(fill).toContain('background-color: Highlight')
    expect(fill).toContain('forced-color-adjust: none')
    expect(track).toContain('CanvasText')
  })
})

describe('a slotted label', () => {
  test('sits above the bar across the whole row, with hooks that fall back to today', () => {
    const label = rule('slot[name="label"]::slotted(*)')
    expect(label).toContain('grid-column: 1 / -1')
    expect(label).toContain('display: block')
    expect(label).toContain('color: var(--progress-label-color, var(--helix-color-foreground))')
    expect(label).toContain('font-size: var(--progress-label-size, var(--helix-text-sm))')
    expect(label).toContain('margin-block-end: var(--progress-label-gap, var(--helix-space-2xs))')
  })
})

/* Every visual decision is a hook named after the family, defaulting to what
   was drawn before the hook existed. */
describe("the progress bar's hooks", () => {
  test('are read by the sheet, each with the old value as its fallback', () => {
    const declared = (customElements.get('helix-progress') as unknown as { styles: unknown }).styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => {
        const sheet = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
        return sheet.cssText ?? Array.from(sheet.cssRules ?? [], (rule) => rule.cssText).join('\n')
      })
      .join('\n')
      /* A formatter breaks a long fallback after `var(`. */
      .replace(/\(\s+/g, '(')
    for (const hook of [
      '--progress-radius',
      '--progress-value-color',
      '--progress-value-gap',
      '--progress-value-size',
    ]) {
      expect(text).toContain(`var(${hook},`)
    }
  })
})

/* Words on the bar, measured in Chromium: the track grows from 8px to 14px for
   `text-xs`, and the words read in the on-primary ink over the fill and the
   page's ink over the track, split where the fill ends. */
describe('words on the bar', () => {
  test('make room only while there are any, and paint over the fill', () => {
    expect(rule('[part="content"]')).toContain('display: none')
    expect(rule(':host(:state(content)) [part="track"]')).toContain('display: grid')
    const words = rule(':host(:state(content)) [part="content"]')
    expect(words).toContain('position: relative')
    expect(words).toContain('background-clip: text')
  })

  test('are split in two colors at the fill, each with a hook', () => {
    const words = rule(':host(:state(content)) [part="content"]')
    expect(words).toContain(
      'var(--progress-content-fill-color, var(--helix-color-foreground-on-primary))',
    )
    expect(words).toContain('var(--progress-content-color, var(--helix-color-foreground))')
    expect(words).toContain('calc(var(--progress-fraction, 0) * 100%)')
  })
})
