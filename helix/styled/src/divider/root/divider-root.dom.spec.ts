import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The separator role and its orientation are the base tier's and are tested
   there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-divider') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('divider', () => {
  test('draws a line either side of whatever is set in, each half taking what is left', async () => {
    const divider = await mount('<helix-divider>OR</helix-divider>')
    expect(divider.shadowRoot?.querySelectorAll('[part="line"]')).toHaveLength(2)
    expect(part(divider, 'content')).not.toBeNull()
    // `flex: 1` rather than a full width, so the two halves share the room.
    expect(sheet()).toContain('flex: 1 1 0')
  })

  test('nothing set in: the region is marked empty and the sheet takes it out, so the halves meet', async () => {
    /* `:empty` cannot ask this, since the region always holds a `<slot>`. The
       base tier answers it and this rule is what closes the gap; with a flex
       gap instead, every plain divider had a 12px break in it. */
    const bare = await mount('<helix-divider></helix-divider>')
    expect(part(bare, 'content')?.hasAttribute('data-empty')).toBe(true)
    expect(rule('[part="content"][data-empty]')).toContain('display: none')
    expect(rule(':host')).not.toMatch(/\ngap:/)

    const worded = await mount('<helix-divider>OR</helix-divider>')
    expect(part(worded, 'content')?.hasAttribute('data-empty')).toBe(false)
  })

  test('a vertical rule stretches to its row, and takes a length only when asked', () => {
    // Between toolbar items it matches them without being told how tall they
    // are; in a byline the hook says how long, and a floor keeps it visible.
    expect(sheet()).toContain('align-self: stretch')
    expect(sheet()).toContain('block-size: var(--divider-length, auto)')
    expect(rule(':host([orientation="vertical"]) [part="line"]')).toContain('min-block-size: 1em')
  })

  test('the inset comes off the ends of the rule, one hook for both and a pair for each', () => {
    expect(sheet()).toMatch(
      /padding-inline-end: var\(--divider-padding-end, var\(--divider-padding, var\(--helix-space-none\)\)\)/,
    )
    expect(sheet()).toMatch(
      /padding-inline-start: var\(\s*--divider-padding-start,\s*var\(--divider-padding, var\(--helix-space-none\)\)\s*\)/,
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of [
      '--divider-color',
      '--divider-length',
      '--divider-padding',
      '--divider-padding-end',
      '--divider-padding-start',
      '--divider-thickness',
    ]) {
      // A fallback written across lines keeps its line breaks in the sheet.
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

/* wa-divider's label placement: content toward one end, with a short length of
   line kept before or after it. */
describe('content placement', () => {
  test('keeps a short line before the content at the start, or after it at the end', () => {
    const placed = rule(
      ':host([content-placement="start"]) [part="line"]:has(+ [part="content"]:not([data-empty])),\n:host([content-placement="end"]) [part="content"]:not([data-empty]) + [part="line"]',
    )
    expect(placed).toContain('flex: 0 0 var(--divider-content-offset, var(--helix-space-lg))')
  })

  test('reflects, so the sheet can reach it from a script', async () => {
    const divider = (await mount('<helix-divider>Or</helix-divider>')) as HTMLElement & {
      contentPlacement?: string
      updateComplete: Promise<boolean>
    }
    divider.contentPlacement = 'start'
    await divider.updateComplete
    expect(divider.getAttribute('content-placement')).toBe('start')
  })

  test('the content takes a color and a gap hook that fall back to today', () => {
    const content = rule('[part="content"]')
    expect(content).toContain(
      'color: var(--divider-content-color, var(--helix-color-foreground-muted))',
    )
    expect(content).toContain('margin-inline: var(--divider-content-gap, var(--helix-space-sm))')
  })

  /* The word set into the line was fixed at the sans face and the `xs` step,
     so a section label in a form could not match the labels around it. */
  test("the content's face, size and weight are hooks on what they were", () => {
    const content = rule('[part="content"]')
    expect(content).toContain(
      'font-family: var(--divider-content-font-family, var(--helix-font-sans))',
    )
    expect(content).toContain('font-size: var(--divider-content-font-size, var(--helix-text-xs))')
    expect(content).toContain('font-weight: var(--divider-content-font-weight, inherit)')
  })
})
