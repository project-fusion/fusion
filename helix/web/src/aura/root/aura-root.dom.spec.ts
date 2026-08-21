import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

/* Registered before the module is evaluated, and the import is dynamic for
   exactly that reason: `@customElement` runs at evaluation, and a static import
   would run it before `registerDom` has installed a `customElements` to
   register against. The element then never upgrades and every assertion about
   its shadow root reads `undefined`, which `not.toBeNull()` happily passes. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('aura', () => {
  test('renders a canvas and hides it from assistive technology', async () => {
    /* Decorative by definition: it draws light behind content and has nothing
       to announce. The host stays visible to the tree so a consumer can label
       the region it sits behind. */
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(host.getAttribute('aria-hidden')).toBeNull()
  })

  test('survives a machine with no WebGL, because the fallback is underneath', async () => {
    /* happy-dom returns null from `getContext`, which is exactly the case a
       reader on a refused context gets. The element must render and stay
       usable: the canvas simply never paints, and the host's own token
       gradient is what shows. Nothing detects this, which is the point. */
    const host = (await mount('<helix-aura shape="rays"></helix-aura>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('canvas')).toBeDefined()
    expect(host.isConnected).toBe(true)
  })

  test('the shape reflects and the numbers do not', async () => {
    // Reflection exists so a selector can reach a value. The fallback gradient
    // selects on `shape`; nothing selects on `speed`.
    const host = (await mount('<helix-aura></helix-aura>')) as HTMLElement & {
      shape: string
      speed: number
      updateComplete: Promise<boolean>
    }
    host.shape = 'aurora'
    host.speed = 2
    await host.updateComplete
    expect(host.getAttribute('shape')).toBe('aurora')
    expect(host.getAttribute('speed')).toBeNull()
  })
})
