import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * The layers menu is an entry of its own, so a map without one carries none
 * of its code. A map asks its class for the menu as it draws, and a class the
 * entry never added it to draws no button and says which entry to import.
 */

let Frame: typeof import('../root/map-root.js').HelixHeadlessMap

beforeAll(async () => {
  registerDom()
  ;({ HelixHeadlessMap: Frame } = await import('../index.js'))
  await import('./index.js')
  await import('../route/index.js')
  /* A map class the entry has added nothing to, as a page that never imported
     it has, since the specs of this family share one registry. */
  customElements.define(
    'bare-layers-map',
    class extends Frame {
      static layersMenu = undefined
    },
  )
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const route =
  '<helix-headless-map-route label="To the castle" points="55.95,-3.19 55.94,-3.2"></helix-headless-map-route>'

describe('the layers entry', () => {
  test('draws the button, and a press opens the menu with a tile for the layer', async () => {
    const map = await mount(
      `<helix-headless-map label="Edinburgh" controls="layers">${route}</helix-headless-map>`,
    )
    await (map as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    const toggle = part(map, 'layers-toggle') as HTMLElement
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    toggle.click()
    await (map as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(part(map, 'layer-name')?.textContent).toBe('To the castle')
  })

  test('a map without it draws no button, and says which entry to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const map = await mount(
      `<bare-layers-map label="Edinburgh" controls="layers zoom">${route}</bare-layers-map>`,
    )
    await (map as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(part(map, 'layers-toggle')).toBeNull()
    await painted()
    expect(warnings).toEqual([
      "<bare-layers-map> names `layers` in `controls`, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/map/layers'.",
    ])
  })
})
