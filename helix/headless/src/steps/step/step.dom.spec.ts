import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Step = HTMLElement & { complete: boolean; current: boolean; disabled: boolean; select(): void }

const step = async (attributes = ''): Promise<Step> =>
  (await mount(`<helix-base-step value="one" ${attributes}>One</helix-base-step>`)) as Step

/**
 * One stage, and the contract that is the step's own rather than the run's.
 *
 * **What the parent already proves is not repeated here**, which is 198's whole
 * recommendation: `Steps` exercises walking a run, which is the only arrangement
 * that means anything for coordination. What is left over is what a single step
 * answers for on its own, and every assertion below is about this element in
 * isolation.
 */
describe('one step', () => {
  /* `complete` and `current` are separate and both may be false, which is the
     ordinary state of a stage nobody has reached. The mark is what says which. */
  test('draws an empty ring until it is reached', async () => {
    const host = await step()
    expect(host.complete).toBe(false)
    expect(host.current).toBe(false)
    expect(part(host, 'marker')).not.toBeNull()
  })

  /* Complete wins over current, so a reader who steps back into a finished
     stage keeps its check rather than losing it for being where they are. */
  test('keeps its check when the reader steps back into it', async () => {
    const host = await step('complete current')
    expect(host.complete).toBe(true)
    expect(host.current).toBe(true)
    expect(part(host, 'mark')).not.toBeNull()
  })

  /* The content part is always rendered and `current` is what opens it, which
     is a stylesheet's job rather than this tier's: the headless step owns the
     box and the reflected state, and whether the box is shown is a rule in
     `helix/web`. Asserted as what this tier actually promises, since a spec
     with no layout engine cannot see `display` and one that pretended to would
     be passing against nothing. */
  test('always renders the content box, and reflects what opens it', async () => {
    const closed = await step()
    const open = await step('current')
    expect(part(closed, 'content')).not.toBeNull()
    expect(part(open, 'content')).not.toBeNull()
    expect(closed.hasAttribute('current')).toBe(false)
    expect(open.hasAttribute('current')).toBe(true)
  })

  /* Announcing is the step's own act, and refusing is too: a disabled stage is
     one the reader may not go to, so it says nothing rather than saying it
     quietly. */
  test('announces itself when selected, and stays silent when it is refusing', async () => {
    const host = await step()
    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    host.select()
    expect(heard).toBe(1)

    const refusing = await step('disabled')
    let ignored = 0
    refusing.addEventListener('helix-select', () => {
      ignored += 1
    })
    refusing.select()
    expect(ignored).toBe(0)
  })

  /* Every one of these reflects, so a document rule can select the state and a
     server can emit it. */
  test('mirrors its state to the host, where a stylesheet can read it', async () => {
    const host = await step('complete')
    expect(host.hasAttribute('complete')).toBe(true)
    host.complete = false
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(host.hasAttribute('complete')).toBe(false)
  })
})
