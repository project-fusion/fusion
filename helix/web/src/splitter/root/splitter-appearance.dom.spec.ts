import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The one assertion about Splitter that is the stylesheet's: which of two
   rules comes last. It reads `customElements.get('helix-splitter').styles`,
   so it is about the styled element by construction and cannot follow the
   behaviour to the base tier. */
describe('splitter appearance', () => {
  test('the accent is on the drag, not on the interest', async () => {
    // Hover is a question and a drag is an answer, so the rule that answers has
    // to be the later of the two: they tie on specificity, and a tie is settled
    // by order alone.
    //
    // Against the declared text rather than a computed color, because happy-dom
    // resolves no cascade to ask. The colors themselves were checked in a
    // browser, where reading one straight after flipping the attribute returns
    // the transition mid-flight and lies.
    const declared = (customElements.get('helix-splitter') as unknown as { styles: unknown }).styles
    const sheet = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n')
    const accent = sheet.indexOf('--splitter-drag-color')
    const interest = sheet.indexOf('--splitter-hover-color')
    expect(interest).toBeGreaterThan(-1)
    expect(accent).toBeGreaterThan(interest)
  })
})
