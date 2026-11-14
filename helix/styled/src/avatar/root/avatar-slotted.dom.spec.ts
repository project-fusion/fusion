import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* The color a `start` or `end` slot gives what is put in it. Written on
 * `::slotted(*)`, it is a declaration from the slot's shadow tree, the outer
 * context to the slotted element's own, so it beats that element's `:host`
 * color: an avatar in a list row drew its initials muted. Written on the slot,
 * it is inherited, which reaches an icon and a bare span and loses to any
 * component that sets its own.
 *
 * The rule text is held here for every family; the cascade only a browser
 * resolves, so run the rest with `bun run specs:browser avatar`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../input/index.js')
  await import('../../textarea/index.js')
  await import('../../filter-input/index.js')
  await import('../../code-input/index.js')
  await import('../../date-input/index.js')
  await import('../../color-input/index.js')
  await import('../../combobox/index.js')
  await import('../../number-input/index.js')
  await import('../../time-input/index.js')
  await import('../../app-header/index.js')
  await import('../../tree/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

/** Each family, the slots that color what is put in them, and the markup around the slotted content. */
const FAMILIES: { slots: ('end' | 'start')[]; tag: string; wrap?: (inner: string) => string }[] = [
  { slots: ['start', 'end'], tag: 'input' },
  { slots: ['start', 'end'], tag: 'textarea' },
  { slots: ['start', 'end'], tag: 'filter-input' },
  { slots: ['start', 'end'], tag: 'code-input' },
  { slots: ['start', 'end'], tag: 'date-input' },
  { slots: ['start', 'end'], tag: 'color-input' },
  { slots: ['start', 'end'], tag: 'combobox' },
  { slots: ['start', 'end'], tag: 'number-input' },
  { slots: ['start', 'end'], tag: 'time-input' },
  { slots: ['start'], tag: 'app-header' },
  {
    slots: ['start'],
    tag: 'tree-item',
    wrap: (inner) => `<helix-tree label="Files">${inner}</helix-tree>`,
  },
]

/** Every rule in the family's sheet, keyed by its selector list. */
const rules = (tag: string): Map<string, string> => {
  const declared = (customElements.get(`helix-${tag}`) as unknown as { styles: unknown }).styles
  const text = (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const found = new Map<string, string>()
  for (const [, selector, body] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    found.set((selector ?? '').trim().replace(/\s+/g, ' '), body ?? '')
  }
  return found
}

/**
 * Whether any rule whose selector list names `selector` declares a `color`. A
 * sheet generated from a neutral source writes the slot under `:host`, as
 * `:host slot[name="start"]`, which names the same slot.
 */
const colors = (sheet: Map<string, string>, selector: string): boolean =>
  [...sheet].some(
    ([list, body]) =>
      list.split(',').some((one) => one.trim().replace(/^:host /, '') === selector) &&
      /(^|[;\s])color:/.test(body),
  )

const host = async (tag: string, slot: string, inner: string): Promise<HTMLElement> => {
  const family = FAMILIES.find((one) => one.tag === tag)
  const markup = `<helix-${tag} value="one" label="Field">${inner}</helix-${tag}>`
  const mounted = (await mount(family?.wrap ? family.wrap(markup) : markup)) as HTMLElement &
    Updatable
  await settle(mounted)
  const element = (
    mounted.localName === `helix-${tag}` ? mounted : mounted.querySelector(`helix-${tag}`)
  ) as HTMLElement & Updatable
  await settle(element)
  expect(element.shadowRoot?.querySelector(`slot[name="${slot}"]`)).not.toBeNull()
  return element
}

for (const { slots, tag } of FAMILIES) {
  describe(`helix-${tag}`, () => {
    for (const slot of slots) {
      test(`the ${slot} slot colors by inheritance, not on what is slotted`, () => {
        const sheet = rules(tag)
        expect(colors(sheet, `slot[name="${slot}"]`)).toBe(true)
        expect(colors(sheet, `slot[name="${slot}"]::slotted(*)`)).toBe(false)
      })

      /* Through the avatar's own hook, so its color differs from every slot's:
         a `::slotted` color would still win over it, as it won over the
         default. */
      geometry(`an avatar in ${slot} keeps its own color`, async () => {
        const element = await host(
          tag,
          slot,
          `<helix-avatar slot="${slot}" name="Ada Lovelace" style="--avatar-color: rgb(4, 5, 6)"></helix-avatar>`,
        )
        const avatar = element.querySelector('helix-avatar') as HTMLElement
        const drawn = getComputedStyle(
          element.shadowRoot?.querySelector(`slot[name="${slot}"]`) as HTMLElement,
        ).color
        expect(drawn).not.toBe('rgb(4, 5, 6)')
        expect(getComputedStyle(avatar).color).toBe('rgb(4, 5, 6)')
      })

      geometry(`a span in ${slot} takes the slot's color`, async () => {
        const element = await host(tag, slot, `<span slot="${slot}">kg</span>`)
        const span = element.querySelector(`[slot="${slot}"]`) as HTMLElement
        const drawn = getComputedStyle(
          element.shadowRoot?.querySelector(`slot[name="${slot}"]`) as HTMLElement,
        ).color
        expect(getComputedStyle(span).color).toBe(drawn)
      })
    }
  })
}
