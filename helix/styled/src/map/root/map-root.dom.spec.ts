import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = HTMLElement & { updateComplete: Promise<boolean> }

const CREDIT =
  'OpenFreeMap © OpenMapTiles Data from OpenStreetMap contributors, and a long run of other sources'

describe('map frame', () => {
  test('`fill` and `credit-placement` are attributes, so a server serves them', async () => {
    const frame = (await mount(
      '<helix-map label="A" fill credit-placement="bottom-end"></helix-map>',
    )) as Frame
    expect(frame.hasAttribute('fill')).toBe(true)
    expect(frame.getAttribute('credit-placement')).toBe('bottom-end')
  })

  if (hasLayout()) {
    test('with `fill`, the map covers a container whose height its content decides', async () => {
      const host = await mount(
        `<section style="position: relative; inline-size: 40rem">
          <helix-map label="A" fill></helix-map>
          <div style="position: relative; padding: 2rem"><p>Maps that work</p><p>when the network</p><p>does not.</p></div>
        </section>`,
      )
      const frame = host.querySelector('helix-map') as Frame
      await frame.updateComplete
      const box = host.getBoundingClientRect()
      const region = (part(frame, 'region') as HTMLElement).getBoundingClientRect()
      expect(box.height).toBeGreaterThan(100)
      expect(region.height).toBeCloseTo(box.height, 0)
      expect(region.width).toBeCloseTo(box.width, 0)
      expect(region.top).toBeCloseTo(box.top, 0)
    })

    test('with `credit-placement`, the credit is one line in its corner, and whole on focus', async () => {
      const frame = (await mount(
        `<helix-map label="A" credit-placement="bottom-end" style="--map-block-size: 20rem; inline-size: 20rem; display: block">
          <span slot="attribution">${CREDIT} <a href="#credit">More</a></span>
        </helix-map>`,
      )) as Frame
      await frame.updateComplete
      const region = (part(frame, 'region') as HTMLElement).getBoundingClientRect()
      const credit = frame.querySelector('[slot="attribution"]') as HTMLElement
      const line = parseFloat(getComputedStyle(credit).lineHeight)
      const placed = credit.getBoundingClientRect()
      expect(placed.height).toBeLessThan(line * 1.5)
      expect(region.bottom - placed.bottom).toBeLessThan(12)
      expect(region.right - placed.right).toBeLessThan(12)
      ;(credit.querySelector('a') as HTMLElement).focus()
      expect(credit.getBoundingClientRect().height).toBeGreaterThan(line * 1.5)
    })

    test('without it, the credit is the strip under the map', async () => {
      const frame = (await mount(
        `<helix-map label="A" style="--map-block-size: 20rem"><span slot="attribution">Credit</span></helix-map>`,
      )) as Frame
      await frame.updateComplete
      const viewport = (part(frame, 'viewport') as HTMLElement).getBoundingClientRect()
      const credit = (
        frame.querySelector('[slot="attribution"]') as HTMLElement
      ).getBoundingClientRect()
      expect(credit.top).toBeGreaterThanOrEqual(viewport.bottom - 1)
    })
  }
})

describe('map frame hooks', () => {
  /* Browser only: happy-dom computes no styles from a shadow sheet. */
  const run = hasLayout() ? test : (): void => {}

  run('the frame, the credit, the needle and the layers menu take their hooks', async () => {
    const frame = (await mount(
      `<helix-map label="A" controls="zoom tilt compass layers" pitch="30" style="--map-radius: 3px; --map-attribution-color: rgb(1, 2, 3); --map-attribution-font-size: 17px; --map-needle-north-color: rgb(7, 8, 9); --map-layers-menu-padding: 5px; --map-chosen-color: rgb(13, 14, 15)">
        <canvas></canvas><span slot="attribution">Credit</span>
        <helix-map-route label="Route"></helix-map-route>
      </helix-map>`,
    )) as Frame
    await frame.updateComplete
    const style = (name: string): CSSStyleDeclaration =>
      getComputedStyle(frame.shadowRoot?.querySelector(name) as Element)
    const credit = getComputedStyle(frame.querySelector('[slot="attribution"]') as Element)
    expect(style('[part="region"]').borderTopLeftRadius).toBe('3px')
    expect([credit.color, credit.fontSize]).toEqual(['rgb(1, 2, 3)', '17px'])
    expect(style('[part="needle"] [data-end="north"]').fill).toBe('rgb(7, 8, 9)')
    expect(style('[part~="tilt"]').backgroundColor).toBe('rgb(13, 14, 15)')
    expect(style('[part="layers-menu"]').padding).toBe('5px')
  })
})
