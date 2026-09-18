import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Step = HTMLElement & { updateComplete: Promise<boolean> }

const steps = async (orientation = ''): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-steps label="Checkout" ${orientation}>
      <helix-step complete>Details</helix-step>
      <helix-step current>Payment</helix-step>
      <helix-step>Review</helix-step>
    </helix-steps>`,
  )) as Step
  await host.updateComplete
  for (const one of host.querySelectorAll('helix-step')) {
    await (one as Step).updateComplete
  }
  return host
}

const half = (step: Element, which: '::before' | '::after'): CSSStyleDeclaration =>
  getComputedStyle(step, which)

/* The rule between the marks, which is this tier's drawing and is drawn on the
   step itself. Nothing is rendered for either half: both are placed entirely
   from properties the list hands down, so there was nothing for a box to carry,
   and `steps-root.ssr.spec.ts` holds the markup to saying so. */
describe('the rule between the marks', () => {
  if (hasLayout()) {
    test('both halves draw, so the line reads as continuous across the gap', async () => {
      /* Two halves rather than one line: a line to the next mark has to know how
         far away it is, and a step knows only its own size. Each reaches half
         the gap beyond its own edge and meets the one coming the other way. */
      const every = [...(await steps()).querySelectorAll('helix-step')]
      const middle = at(every, 1)
      expect(half(middle, '::before').display).not.toBe('none')
      expect(half(middle, '::after').display).not.toBe('none')
      expect(Number.parseFloat(half(middle, '::before').inlineSize)).toBeGreaterThan(0)
      expect(Number.parseFloat(half(middle, '::after').inlineSize)).toBeGreaterThan(0)
    })

    test('nothing arrives at the first and nothing leaves the last', async () => {
      /* `:host(:first-child)` and its pair, which needs no index and no parent
         counting its children, and is true in the server's markup. */
      const every = [...(await steps()).querySelectorAll('helix-step')]
      expect(half(at(every, 0), '::before').display).toBe('none')
      expect(half(at(every, 0), '::after').display).not.toBe('none')
      expect(half(at(every, 2), '::before').display).not.toBe('none')
      expect(half(at(every, 2), '::after').display).toBe('none')
    })

    test('down a column the halves run the other way, which the list decides', async () => {
      /* The list hands the arrangement down as properties because a step cannot
         see `orientation`. The halves read them and turn with no second rule. */
      const every = [...(await steps('orientation="vertical"')).querySelectorAll('helix-step')]
      const middle = at(every, 1)
      expect(Number.parseFloat(half(middle, '::before').blockSize)).toBeGreaterThan(1)
      expect(Number.parseFloat(half(middle, '::after').blockSize)).toBeGreaterThan(1)
    })
  }
})
