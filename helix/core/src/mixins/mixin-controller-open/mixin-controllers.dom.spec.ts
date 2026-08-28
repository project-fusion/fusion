import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The boolean controller mixins, asked the same questions in the same order.
 *
 * **One spec for three, because they are three of a kind and that is the claim
 * worth holding them to.** `MixinControllerOpen`, `MixinControllerChecked` and
 * `MixinControllerActive` are the same 190 to 204 lines with one word changed,
 * and the reason they are separate mixins is that a component wants one of them
 * and not the others, not that they behave differently. Written as three files
 * they would drift, and the drift would be invisible: each would still pass its
 * own copy. Written as one table, a difference has to be declared here.
 *
 * `MixinControllerValue` has its own spec beside it. It is the fourth of the
 * kind and stays out of this table, because it adds `announcesInput` and the
 * form callbacks on top of the contract asked here.
 *
 * **They are not all booleans, which the row calling them four of a kind did
 * not say.** `open` and `checked` carry a boolean; `active` carries a string
 * naming which child is active, as `value` does. So the table moves between two
 * declared states rather than between true and false, and the shape difference
 * is a field here instead of an assumption spread through the assertions.
 */
type Probe = HTMLElement & {
  updateComplete: Promise<boolean>
} & Record<string, unknown>

interface Kind {
  /** What it announces on the way back to rest. */
  closing: string
  /** The attribute markup uses to seed a value the element keeps owning. */
  fallback: string
  /** The state it moves to, a boolean for two of these and a string for one. */
  moved: unknown
  /** What it announces on the way out of rest. */
  opening: string
  /** The state it holds when nothing has said otherwise. */
  resting: unknown
  /** The method a component calls to propose a change. */
  request: string
  /** The property the consumer declares to take ownership. */
  state: string
  /** The element registered for it. */
  tag: string
}

/* **They do not announce the same event, and that is the difference a shared
   table is for.** Open says which way it went, because a listener that only
   cares about dismissal should not have to read a detail to find out; Checked
   is `helix-toggle`, which the events file explains is checkedness having its
   own name and its own boolean; Active is a plain `helix-change`. Three files
   would each have hardcoded their own and nothing would have said they differ. */
const KINDS: Kind[] = [
  {
    closing: 'helix-before-close',
    fallback: 'default-open',
    moved: true,
    opening: 'helix-before-open',
    request: 'requestOpen',
    resting: false,
    state: 'open',
    tag: 'probe-open',
  },
  {
    closing: 'helix-before-toggle',
    fallback: 'default-checked',
    moved: true,
    opening: 'helix-before-toggle',
    request: 'requestChecked',
    resting: false,
    state: 'checked',
    tag: 'probe-checked',
  },
  {
    closing: 'helix-before-activate',
    fallback: 'default-active',
    moved: 'one',
    opening: 'helix-before-activate',
    request: 'requestActive',
    resting: '',
    state: 'active',
    tag: 'probe-active',
  },
]

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinControllerOpen } = await import('./mixin-controller-open.js')
  const { MixinControllerChecked } = await import(
    '../mixin-controller-checked/mixin-controller-checked.js'
  )
  const { MixinControllerActive } = await import(
    '../mixin-controller-active/mixin-controller-active.js'
  )
  customElements.define('probe-open', class extends MixinControllerOpen(HelixElement) {})
  customElements.define('probe-checked', class extends MixinControllerChecked(HelixElement) {})
  customElements.define('probe-active', class extends MixinControllerActive(HelixElement) {})
})

const mount = async (markup: string): Promise<Probe> => {
  document.body.innerHTML = markup
  const host = document.body.firstElementChild as Probe
  await host.updateComplete
  return host
}

const ask = (host: Probe, kind: Kind, next: unknown): boolean =>
  (host[kind.request] as (value: unknown) => boolean)(next)

/* Markup seeds a boolean by the attribute's presence and a string by its
   value, which is the platform's own distinction and not one of ours. */
const seeded = (kind: Kind): string =>
  kind.moved === true ? kind.fallback : `${kind.fallback}="${String(kind.moved)}"`
const claimed = (kind: Kind): string =>
  kind.moved === true ? kind.state : `${kind.state}="${String(kind.moved)}"`

for (const kind of KINDS) {
  describe(`${kind.state}, as a controller mixin`, () => {
    test('is false until something says otherwise', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      expect(host[kind.state]).toBe(kind.resting)
    })

    test(`\`${kind.fallback}\` seeds one the element keeps owning`, async () => {
      const host = await mount(`<${kind.tag} ${seeded(kind)}></${kind.tag}>`)
      expect(host[kind.state]).toBe(kind.moved)
      expect(ask(host, kind, kind.resting)).toBe(true)
      await host.updateComplete
      expect(host[kind.state]).toBe(kind.resting)
    })

    test('an uncontrolled element announces the change and then makes it', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      let heard = 0
      host.addEventListener(kind.opening, () => {
        heard += 1
      })
      expect(ask(host, kind, kind.moved)).toBe(true)
      await host.updateComplete
      expect([heard, host[kind.state]]).toEqual([1, kind.moved])
    })

    test('and a refusal leaves it where it was', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      host.addEventListener(kind.opening, (event) => {
        event.preventDefault()
      })
      expect(ask(host, kind, kind.moved)).toBe(false)
      await host.updateComplete
      expect(host[kind.state]).toBe(kind.resting)
    })

    /* This asserted the opposite until 26 Aug 2026, that a declared property was
       a claim of ownership and the element announced without moving. Control is
       an action now: the element always applies, and a consumer takes the
       decision by refusing it. See 294. */
    test('a declared property is a seed, so the element announces and still moves', async () => {
      const host = await mount(`<${kind.tag} ${claimed(kind)}></${kind.tag}>`)
      let heard = 0
      host.addEventListener(kind.closing, () => {
        heard += 1
      })
      ask(host, kind, kind.resting)
      await host.updateComplete
      expect([heard, host[kind.state]]).toEqual([1, kind.resting])
    })

    test('and refusing is what stops it, whoever declared the property', async () => {
      const host = await mount(`<${kind.tag} ${claimed(kind)}></${kind.tag}>`)
      host.addEventListener(kind.closing, (event: Event) => {
        event.preventDefault()
      })
      ask(host, kind, kind.resting)
      await host.updateComplete
      expect(host[kind.state]).toBe(kind.moved)
    })

    test('and it moves when the consumer passes a new one', async () => {
      const host = await mount(`<${kind.tag} ${claimed(kind)}></${kind.tag}>`)
      host[kind.state] = kind.resting
      await host.updateComplete
      expect(host[kind.state]).toBe(kind.resting)
    })

    /* The mode is read once, at the first update, where markup, a hydrating
       server's attributes and a framework's initial properties have all landed.
       Continuously would mean a script assigning the property handed the element
       to a consumer who never asked for it, and it would stop answering its own
       reader from then on. */
    test('which mode it is in is decided once, so a later assignment does not take it over', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      host[kind.state] = kind.moved
      await host.updateComplete
      expect(ask(host, kind, kind.resting)).toBe(true)
      await host.updateComplete
      expect(host[kind.state]).toBe(kind.resting)
    })

    test('asking for what it already holds stands, and announces nothing', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      let heard = 0
      for (const name of new Set([kind.opening, kind.closing])) {
        host.addEventListener(name, () => {
          heard += 1
        })
      }
      expect(ask(host, kind, kind.resting)).toBe(true)
      await host.updateComplete
      expect(heard).toBe(0)
    })
  })
}

describe('saying the state moved', () => {
  /* `<details>` fires `toggle` and a popover fires `toggle`, and sixteen
     families here fired neither: two render a real `<dialog>`, ten show a
     `popover="manual"` panel, and the browser was firing something on an
     element inside a shadow root where `toggle` neither bubbles nor composes.
     The disclosures have no native element to fire anything at all. See 296. */
  const heard = (host: HTMLElement, act: () => void): string[] => {
    const said: string[] = []
    const listen = (event: Event): void => {
      said.push((event as Event & { newState: string }).newState)
    }
    host.addEventListener('toggle', listen)
    act()
    host.removeEventListener('toggle', listen)
    return said
  }

  for (const kind of KINDS.filter((one) => one.state === 'open')) {
    test('announces `toggle` from the host once the state has gone', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      expect(heard(host, () => ask(host, kind, kind.moved))).toEqual(['open'])
      expect(heard(host, () => ask(host, kind, kind.resting))).toEqual(['closed'])
    })

    test('and says nothing where the change was refused', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      host.addEventListener(kind.opening, (event: Event) => {
        event.preventDefault()
      })
      expect(heard(host, () => ask(host, kind, kind.moved))).toEqual([])
    })

    test('and says nothing where it was already in that state', async () => {
      const host = await mount(`<${kind.tag}></${kind.tag}>`)
      expect(heard(host, () => ask(host, kind, kind.resting))).toEqual([])
    })
  }
})
