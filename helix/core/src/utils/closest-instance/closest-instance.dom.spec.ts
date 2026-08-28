import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The nearest ancestor that *is* a class, rather than the nearest that is
 * spelled a certain way.
 *
 * **Identity rather than tag name**, which is the rule the headless tier turns
 * on: matching `helix-accordion-item` ties that tier to the styled one by
 * string, and subclassing a headless element under a third tag is exactly what the
 * split exists to allow. Under a third tag the lookup returned `null`, so an
 * accordion's `mode` was ignored and every section behaved as `multiple`, with
 * no error anywhere.
 *
 * **And `closest()` alone cannot do it**, which is why this walks. `closest()`
 * stops at a shadow boundary, and a component slotted into another's shadow
 * root has a `parentNode` chain that ends at a `ShadowRoot`. Following `host` is
 * what makes a nested arrangement resolve, and nesting through a slot is the
 * ordinary case for anything composable.
 */
/* Declared inside the hook, because `HTMLElement` is not a global until
   `registerDom` has run: a class extending it at module scope is evaluated on
   import and throws before any test starts. */
let Owner: typeof HTMLElement
let Renamed: typeof HTMLElement
let closestInstance: <T extends Element>(
  from: Element | null | undefined,
  Ctor: abstract new (...args: never[]) => T,
) => T | null

beforeAll(async () => {
  registerDom()
  closestInstance = (await import('./closest-instance.js')).closestInstance
  Owner = class extends HTMLElement {}
  Renamed = class extends Owner {}
  customElements.define('probe-owner', Owner)
  customElements.define('probe-other', class extends HTMLElement {})
  customElements.define('probe-renamed', Renamed)
})

describe('walking up for an owner', () => {
  test('finds one that is an ancestor', () => {
    document.body.innerHTML = '<probe-owner><span><b id="deep">x</b></span></probe-owner>'
    expect(closestInstance(document.getElementById('deep'), Owner)).toBeInstanceOf(Owner)
  })

  test('and the element itself counts, since it is its own nearest', () => {
    document.body.innerHTML = '<probe-owner id="self"></probe-owner>'
    expect(closestInstance(document.getElementById('self'), Owner)?.id).toBe('self')
  })

  test('answers nothing when there is no such ancestor', () => {
    document.body.innerHTML = '<probe-other><b id="deep">x</b></probe-other>'
    expect(closestInstance(document.getElementById('deep'), Owner)).toBeNull()
  })

  test('and takes nothing to start from without throwing', () => {
    expect(closestInstance(null, Owner)).toBeNull()
    expect(closestInstance(undefined, Owner)).toBeNull()
  })
})

describe('what it matches on', () => {
  /* The fault the rule exists for: a subclass under its own tag is still the
     class, and a lookup by tag name would miss it. `helix/styled` is exactly this
     case, since every styled element is a headless element under another name. */
  test('a subclass under a different tag is still an owner', () => {
    document.body.innerHTML = '<probe-renamed><b id="deep">x</b></probe-renamed>'
    const found = closestInstance(document.getElementById('deep'), Owner)
    expect(found).toBeInstanceOf(Renamed)
    expect(found?.localName).toBe('probe-renamed')
  })

  test('and a different class is not an owner however it is nested', () => {
    document.body.innerHTML =
      '<probe-other><probe-other><b id="deep">x</b></probe-other></probe-other>'
    expect(closestInstance(document.getElementById('deep'), Owner)).toBeNull()
  })
})

describe('crossing a shadow boundary', () => {
  /* `closest()` stops here and this does not, which is the whole reason the
     walk is written out. */
  test('steps from a shadow root to its host', () => {
    document.body.innerHTML = '<probe-owner id="outer"></probe-owner>'
    const outer = document.getElementById('outer') as HTMLElement
    const root = outer.attachShadow({ mode: 'open' })
    root.innerHTML = '<b id="inside">x</b>'
    const inside = root.getElementById('inside')
    expect(inside?.closest('probe-owner')).toBeNull()
    expect(closestInstance(inside, Owner)?.id).toBe('outer')
  })
})
