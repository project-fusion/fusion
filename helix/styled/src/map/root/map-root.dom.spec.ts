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
