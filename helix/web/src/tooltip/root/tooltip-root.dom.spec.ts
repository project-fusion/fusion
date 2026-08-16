import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tooltip = HTMLElement & {
  content: string
  delay: number
  open: boolean
  placement: string
  show: () => void
  hide: () => void
  updateComplete: Promise<unknown>
  internals?: ElementInternals & { ariaDescribedByElements?: Element[] | null }
}

const tooltip = async (attrs = 'content="Regenerates the manifests"'): Promise<Tooltip> =>
  (await mount(`<helix-tooltip ${attrs}><button>Analyze</button></helix-tooltip>`)) as Tooltip

/** A tooltip whose bubble is filled from the light DOM instead of `content`. */
const slotted = async (attrs = '', inner = '<b>Rich</b>'): Promise<Tooltip> =>
  (await mount(
    `<helix-tooltip ${attrs}><button>Analyze</button><span slot="content">${inner}</span></helix-tooltip>`,
  )) as Tooltip

/**
 * The content slot, and what a consumer put in it.
 *
 * `assignedNodes` without `flatten` on purpose, and not only because that is
 * the question being asked. happy-dom returns an empty list from the flattened
 * form where a browser returns the fallback, so a test written on `flatten`
 * would assert the opposite of what ships.
 */
const contentSlot = (tip: Tooltip): HTMLSlotElement | null =>
  tip.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="content"]') ?? null

const assigned = (tip: Tooltip): Node[] => contentSlot(tip)?.assignedNodes() ?? []

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
    expect(tip.open).toBe(false)

    tip.dispatchEvent(new Event('focusin'))
    await tip.updateComplete
    expect(tip.open).toBe(true)
  })

  test('it announces before it opens, and a refusal holds it shut', async () => {
    const tip = await tooltip()
    tip.addEventListener('helix-open', (event) => {
      event.preventDefault()
    })
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(false)
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

  test('slotted content replaces the property rather than joining it', async () => {
    // Anything assigned wins, and the property is what the slot falls back to,
    // so a non-empty assignment is what settles which of the two shows.
    const tip = await slotted('content="Replaced"')
    expect(assigned(tip).map((node) => (node as Element).tagName)).toEqual(['SPAN'])
  })

  test('the property is the fallback, and lives in the slot', async () => {
    // Nothing assigned, so what shows is the slot's own content: the property.
    const tip = await tooltip()
    expect(assigned(tip)).toEqual([])
    expect(contentSlot(tip)?.textContent).toContain('Regenerates the manifests')
  })

  test('a tooltip with only slotted content shows, and is linked', async () => {
    // `content` is empty here, so an emptiness test that asked the property
    // rather than the slot would refuse to open a tooltip that has content.
    const tip = await slotted()
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(true)
    const linked = tip.internals?.ariaDescribedByElements
    expect(Array.isArray(linked) ? linked[0] : null).toBe(part(tip, 'tooltip'))
  })

  test('an empty slot is as empty as an empty property', async () => {
    const tip = await slotted('', '   ')
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })

  test('an element with no text of its own is still something to say', async () => {
    // The reason emptiness cannot be a text test. An icon is exactly what a
    // consumer reaches for the slot to say.
    const tip = await slotted('', '<helix-icon name="info"></helix-icon>')
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(true)
  })

  test('disabled never shows', async () => {
    const tip = await tooltip('content="x" disabled')
    tip.show()
    await tip.updateComplete
    expect(part(tip, 'tooltip')?.matches(':popover-open') ?? false).toBe(false)
  })
})
