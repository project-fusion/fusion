import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Steps = HTMLElement & { updateComplete: Promise<unknown> }

const steps = async (attrs = ''): Promise<Steps> => {
  const host = (await mount(`<helix-steps ${attrs}>
    <helix-step complete>Details</helix-step>
    <helix-step current>Payment</helix-step>
    <helix-step>Review</helix-step>
  </helix-steps>`)) as Steps
  await host.updateComplete
  return host
}

/** The semantics live on the internals, never as attributes on the host. */
const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

describe('steps', () => {
  test('the list is the host, because the steps are the consumer’s elements', async () => {
    // An `<ol>` in the shadow root would be a list whose items are elsewhere.
    const host = await steps('label="Checkout"')
    expect(internals(host).role).toBe('list')
    expect(internals(host).ariaLabel).toBe('Checkout')
  })

  test('each step is an item, and only the current one says so', async () => {
    const host = await steps()
    const all = [...host.querySelectorAll('helix-step')] as HTMLElement[]
    for (const step of all) {
      await (step as unknown as Steps).updateComplete
    }
    expect(all.map((s) => internals(s).role)).toEqual(['listitem', 'listitem', 'listitem'])
    expect(all.map((s) => internals(s).ariaCurrent)).toEqual([null, 'step', null])
  })

  test('a finished step draws a check where the number was', async () => {
    const host = await steps()
    const [first, , last] = [...host.querySelectorAll('helix-step')] as HTMLElement[]
    await (first as unknown as Steps).updateComplete
    await (last as unknown as Steps).updateComplete
    expect(first.shadowRoot?.querySelector('svg')).not.toBeNull()
    expect(last.shadowRoot?.querySelector('svg')).toBeNull()
  })

  test('complete and current are independent, because a reader can step back', async () => {
    /* Both true is a reader reviewing a stage they already finished. A stepper
       that treats them as one state loses the check the moment they go back. */
    const host = (await mount(
      `<helix-steps><helix-step complete current>Details</helix-step></helix-steps>`,
    )) as Steps
    await host.updateComplete
    const step = host.querySelector('helix-step') as HTMLElement
    await (step as unknown as Steps).updateComplete
    expect(internals(step).ariaCurrent).toBe('step')
    expect(step.shadowRoot?.querySelector('svg')).not.toBeNull()
  })

  test('every step carries its own connector, so nothing counts children', async () => {
    // The first one's is hidden in CSS by `:host(:first-child)`, which needs no
    // index and no coordination from the list.
    const host = await steps()
    const all = [...host.querySelectorAll('helix-step')] as HTMLElement[]
    for (const step of all) {
      await (step as unknown as Steps).updateComplete
      expect(step.shadowRoot?.querySelector('[part="connector"]')).not.toBeNull()
    }
  })
})
