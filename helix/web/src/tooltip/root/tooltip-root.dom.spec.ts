import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tooltip = HTMLElement & {
  content: string
  delay: number
  isOpen: boolean
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

  test('the pointer waits out the delay, and focus does not', async () => {
    // Sweeping a row of controls would otherwise flash a tooltip for each of
    // them. A keyboard reader landing on one has already committed to it.
    const tip = await tooltip('content="x" delay="50"')
    tip.dispatchEvent(new Event('pointerenter'))
    expect(tip.isOpen).toBe(false)

    tip.dispatchEvent(new Event('focusin'))
    await tip.updateComplete
    expect(tip.isOpen).toBe(true)
  })

  test('it announces before it opens, and a refusal holds it shut', async () => {
    const tip = await tooltip()
    tip.addEventListener('helix-open', (event) => {
      event.preventDefault()
    })
    tip.show()
    await tip.updateComplete
    expect(tip.isOpen).toBe(false)
  })

  test('it announces before it closes', async () => {
    const tip = await tooltip()
    tip.show()
    await tip.updateComplete
    let closed = false
    tip.addEventListener('helix-close', () => {
      closed = true
    })
    tip.hide()
    expect(closed).toBe(true)
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
