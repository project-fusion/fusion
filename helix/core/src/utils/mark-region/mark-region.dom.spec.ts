import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { RegionOptions } from './mark-region.js'

/**
 * Whether a rendered region says it holds anything.
 *
 * The three arguments are the three things that varied between the nine
 * families that wrote this out, so they are what this asserts: which slots
 * count, what the component itself draws into the region, and whether an empty
 * region leaves the box tree.
 */
let markRegion: (
  root: ParentNode | null | undefined,
  part: string,
  slots: readonly string[],
  options?: RegionOptions,
) => void

beforeAll(async () => {
  registerDom()
  markRegion = (await import('./mark-region.js')).markRegion
  customElements.define(
    'probe-region',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<div part="region"><slot name="one"></slot><slot name="two"></slot><slot></slot><b part="drawn" hidden></b></div>'
        }
      }
    },
  )
})

const region = (markup: string): HTMLElement => {
  document.body.innerHTML = `<probe-region>${markup}</probe-region>`
  const host = document.body.firstElementChild as HTMLElement
  return host.shadowRoot?.querySelector('[part="region"]') as HTMLElement
}

const root = (): ParentNode =>
  (document.body.firstElementChild as HTMLElement).shadowRoot as ParentNode

describe('what makes a region empty', () => {
  test('no slot filled, so it is marked and taken out of the box tree', () => {
    const box = region('')
    markRegion(root(), 'region', ['one'])
    expect(box.hasAttribute('data-empty')).toBe(true)
    expect(box.hasAttribute('hidden')).toBe(true)
  })

  test('one filled slot out of several is enough', () => {
    const box = region('<b slot="two">x</b>')
    markRegion(root(), 'region', ['one', 'two'])
    expect(box.hasAttribute('data-empty')).toBe(false)
    expect(box.hasAttribute('hidden')).toBe(false)
  })

  /* The empty string is the default slot, and it resolves to `slot:not([name])`
     rather than to a bare `slot`, which would match whichever slot comes first
     in the shadow root: here that is `slot[name="one"]`, so a bare `slot` would
     answer about the wrong one. */
  test('the empty string names the default slot rather than the first one', () => {
    const box = region('<b>x</b>')
    markRegion(root(), 'region', [''])
    expect(box.hasAttribute('data-empty')).toBe(false)
  })

  test('a region the component drew into itself is not empty', () => {
    const box = region('')
    markRegion(root(), 'region', ['one'], { occupied: '[part="drawn"]' })
    expect(box.hasAttribute('data-empty')).toBe(false)
  })

  /* Chat's message is this case: the typing indicator is painted into a content
     region whose emptiness is what says to draw it, so hiding the region would
     take the indicator with it. */
  test('`hide: false` marks the region and leaves its box standing', () => {
    const box = region('')
    markRegion(root(), 'region', ['one'], { hide: false })
    expect(box.hasAttribute('data-empty')).toBe(true)
    expect(box.hasAttribute('hidden')).toBe(false)
  })

  test('the mark clears when the region fills, both attributes together', () => {
    const box = region('')
    markRegion(root(), 'region', ['one'])
    const host = document.body.firstElementChild as HTMLElement
    host.innerHTML = '<b slot="one">x</b>'
    markRegion(root(), 'region', ['one'])
    expect(box.hasAttribute('data-empty')).toBe(false)
    expect(box.hasAttribute('hidden')).toBe(false)
  })

  test('a region that is not rendered is not an error', () => {
    region('')
    expect(() => markRegion(root(), 'absent', ['one'])).not.toThrow()
    expect(() => markRegion(null, 'region', ['one'])).not.toThrow()
  })
})
