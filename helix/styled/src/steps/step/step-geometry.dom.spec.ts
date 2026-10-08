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
describe('a row of steps', () => {
  if (hasLayout()) {
    test('a step with a shorter description keeps its name level with the others', async () => {
      const host = (await mount(
        `<helix-steps label="How it works" style="inline-size: 40rem">
          <helix-step>Go out<span slot="description">Each searcher drops points and logs tracks with no signal at all, all day.</span></helix-step>
          <helix-step>Come back<span slot="description">Short.</span></helix-step>
        </helix-steps>`,
      )) as Step
      await host.updateComplete
      const every = [...host.querySelectorAll('helix-step')] as Step[]
      for (const one of every) {
        await one.updateComplete
      }
      const top = (step: Step): number =>
        (
          step.shadowRoot?.querySelector('[part="label"]') as HTMLElement | null
        )?.getBoundingClientRect().top ?? Number.NaN
      expect(top(at(every, 1))).toBeCloseTo(top(at(every, 0)), 0)
    })
  }
})

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

/* Down a column a closed stage's content collapses to no height. It held
   controls that Tab reached and a screen reader read, at zero height. */
describe('a closed stage down a column', () => {
  test('keeps its content out of the tab order and the accessibility tree', async () => {
    const host = await mount(
      `<helix-steps label="Setup" orientation="vertical" default-active="two">
        <helix-step value="one">One<button slot="content">First</button></helix-step>
        <helix-step value="two">Two<button slot="content">Second</button></helix-step>
        <helix-step value="three">Three<button slot="content">Third</button></helix-step>
      </helix-steps>`,
    )
    const every = [...host.querySelectorAll('helix-step')] as Step[]
    await Promise.all(every.map((one) => one.updateComplete))
    if (hasLayout()) {
      await new Promise((done) => setTimeout(done, 400))
      const shown = [...host.querySelectorAll('button')].map(
        (one) => getComputedStyle(one).visibility,
      )
      expect(shown).toEqual(['hidden', 'visible', 'hidden'])
      return
    }
    /* happy-dom resolves no cascade, so the rule the element adopts is read. */
    const declared = (customElements.get('helix-step') as unknown as { styles: unknown }).styles
    const text = (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n')
    expect(text).toMatch(/\[part="content"\] \{[^}]*visibility: hidden[;}]/)
    expect(text).toMatch(/:host\(\[current\]\) \[part="content"\] \{[^}]*visibility: visible\}/)
  })
})
