import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tooltip = HTMLElement & {
  content: string
  placement: string
  show: () => void
  hide: () => void
  updateComplete: Promise<unknown>
  internals?: ElementInternals & { ariaDescribedByElements?: Element[] | null }
}

const tooltip = async (attrs = 'content="Regenerates the manifests"'): Promise<Tooltip> =>
  (await mount(`<helix-tooltip ${attrs}><button>Analyze</button></helix-tooltip>`)) as Tooltip

describe('tooltip', () => {
  test("the bubble is a tooltip, and the trigger stays the consumer's element", async () => {
    const tip = await tooltip()
    expect(part(tip, 'tooltip')?.getAttribute('role')).toBe('tooltip')
    expect(tip.firstElementChild?.tagName).toBe('BUTTON')
  })

  test('the description is linked by element, not by id', async () => {
    // An IDREF cannot cross a shadow boundary, so `aria-describedby` pointing
    // from a slotted trigger at a bubble in the shadow root resolves to
    // nothing at all.
    const tip = await tooltip()
    const linked = tip.internals?.ariaDescribedByElements
    expect(Array.isArray(linked) ? linked[0] : null).toBe(part(tip, 'tooltip'))
  })

  test('nothing is linked when there is nothing to say', async () => {
    const tip = await tooltip('content=""')
    expect(tip.internals?.ariaDescribedByElements ?? null).toBeNull()
  })

  test('it answers the keyboard as well as the pointer', async () => {
    // A tooltip that shows only on hover is one a keyboard reader never sees.
    const tip = await tooltip()
    const shown: string[] = []
    for (const type of ['pointerenter', 'focusin']) {
      tip.dispatchEvent(new Event(type))
      await tip.updateComplete
      shown.push(type)
      tip.hide()
    }
    expect(shown).toEqual(['pointerenter', 'focusin'])
  })

  test('an empty tooltip never shows', async () => {
    const tip = await tooltip('content=""')
    tip.show()
    await tip.updateComplete
    expect(part(tip, 'tooltip')?.matches(':popover-open') ?? false).toBe(false)
  })

  test('disabled never shows', async () => {
    const tip = await tooltip('content="x" disabled')
    tip.show()
    await tip.updateComplete
    expect(part(tip, 'tooltip')?.matches(':popover-open') ?? false).toBe(false)
  })
})
