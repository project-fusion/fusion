import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

/**
 * Whether a consumer put anything in a slot, which no selector can answer.
 *
 * `slot:empty` looks like the answer and is not: a slot's children are its
 * *fallback*, and assigned nodes are not children, so `:empty` is true whenever
 * the fallback is absent whether or not anything was slotted.
 *
 * It matters because an empty wrapper is not free. A region that generates a box
 * is a flex or grid item whether or not it holds anything, so it takes the
 * container's gap: an announcement with no actions paid the row gap twice and a
 * blockquote with no attribution reserved a space under every quote.
 */
let slotFilled: (slot: HTMLSlotElement | null | undefined) => boolean

beforeAll(async () => {
  registerDom()
  slotFilled = (await import('./slot-filled.js')).slotFilled
  customElements.define(
    'probe-slotted',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<slot name="thing"><i>fallback</i></slot><slot name="bare"></slot>'
        }
      }
    },
  )
})

const slot = (markup: string, name = 'thing'): HTMLSlotElement | null => {
  document.body.innerHTML = `<probe-slotted>${markup}</probe-slotted>`
  const host = document.body.firstElementChild as HTMLElement
  return host.shadowRoot?.querySelector(`slot[name="${name}"]`) ?? null
}

describe('what counts as filled', () => {
  test('an element does', () => {
    expect(slotFilled(slot('<b slot="thing">x</b>'))).toBe(true)
  })

  /* Text or an element, because neither alone is the test: elements alone count
     a whitespace-only span as content, and text alone counts an icon as
     nothing. */
  test('and so does text on its own', () => {
    expect(slotFilled(slot('<span slot="thing">words</span>'))).toBe(true)
  })

  test('nothing slotted is not filled', () => {
    expect(slotFilled(slot('', 'bare'))).toBe(false)
  })

  test('and neither is a slot that does not exist', () => {
    expect(slotFilled(null)).toBe(false)
    expect(slotFilled(undefined)).toBe(false)
  })
})

/* **The fallback case is deliberately not asserted here, and that is a fact
   about the harness rather than about the function.**
   `flatten` is the whole point of the `true` in `assignedNodes({ flatten: true })`:
   this asks "will anything render", where the tooltip's emptiness test asks "did
   the consumer provide anything", so a slot showing its fallback is filled.
   happy-dom returns nothing from a flattened `assignedNodes` where a browser
   returns the fallback, which `helix/testing/src/browser.ts` records in its own
   header as one of the gaps that makes the browser the stronger environment. An
   assertion here would be measuring happy-dom, and one written to pass under it
   would assert the opposite of what ships.
   `helix/core` has no browser lane: `build-specs.mjs` bundles families out of
   `helix/headless` and `helix/web`. Covering this properly means a component
   spec in one of those, which is where the behaviour is consumed anyway. */
