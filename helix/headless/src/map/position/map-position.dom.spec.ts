import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Position = HTMLElement & {
  accuracy?: number
  announceEvery: number
  description?: string
  heading?: number
  lat?: number
  place(properties: Record<string, string | undefined>): void
  placed(name: string): string | undefined
  updateComplete: Promise<boolean>
}

const position = async (attrs: string): Promise<Position> => {
  const host = (await mount(
    `<helix-headless-map-position label="Van 12" lat="1" lng="2" ${attrs}></helix-headless-map-position>`,
  )) as Position
  await host.updateComplete
  return host
}

const said = (host: Position): string => part(host, 'status')?.textContent?.trim() ?? ''
const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

describe('map position', () => {
  test('it is a picture named by its label, and its status is beside the picture rather than inside it', async () => {
    const host = await position('description="Two stops away"')
    const picture = part(host, 'position')
    expect(picture?.getAttribute('role')).toBe('img')
    expect(picture?.getAttribute('aria-label')).toBe('Van 12')
    expect(part(host, 'status')?.getAttribute('role')).toBe('status')
    // An image's children are presentational, so the status cannot be one of them.
    expect(picture?.contains(part(host, 'status') ?? null)).toBe(false)
    expect(said(host)).toBe('Two stops away')
  })

  test('new words are spoken, and words inside the interval wait, the latest spoken when it is over', async () => {
    const host = await position('description="Two stops away" announce-every="60"')
    host.description = 'One stop away'
    await host.updateComplete
    expect(said(host)).toBe('One stop away')
    host.description = 'Arriving'
    await host.updateComplete
    host.description = 'Arrived'
    await host.updateComplete
    expect(said(host)).toBe('One stop away')
    await wait(90)
    await host.updateComplete
    expect(said(host)).toBe('Arrived')
  })

  test('moving, turning, or growing less sure says so as a new place, and a new interval does not', async () => {
    const frame = (await mount(
      '<helix-headless-map label="Fleet"><helix-headless-map-position label="Van 12" lat="1" lng="2"></helix-headless-map-position></helix-headless-map>',
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await frame.updateComplete
    const host = frame.querySelector('helix-headless-map-position') as Position
    await host.updateComplete
    const said: string[] = []
    frame.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    host.lat = 1.5
    await host.updateComplete
    host.heading = 90
    await host.updateComplete
    host.accuracy = 25
    await host.updateComplete
    host.announceEvery = 1000
    await host.updateComplete
    expect(said).toEqual(['place', 'place', 'place'])
    // A heading is written back as an attribute, which a stylesheet draws the arrow on.
    expect(host.getAttribute('heading')).toBe('90')
  })

  test('placed by the connector, it says so in a state, and loses it when the place is taken away', async () => {
    const host = await position('')
    expect(hasState(host, 'placed')).toBe(false)
    host.place({ '--_map-position-x': '10px', '--_map-position-y': '20px' })
    expect(hasState(host, 'placed')).toBe(true)
    expect(host.placed('--_map-position-y')).toBe('20px')
    expect(host.hasAttribute('style')).toBe(false)
    host.place({ '--_map-position-x': undefined, '--_map-position-y': undefined })
    expect(hasState(host, 'placed')).toBe(false)
  })

  test('taken away with words waiting out the interval, it does not speak them', async () => {
    const host = await position('description="Two stops away" announce-every="60"')
    host.description = 'One stop away'
    await host.updateComplete
    host.description = 'Arriving'
    await host.updateComplete
    host.remove()
    await wait(90)
    await host.updateComplete
    expect(said(host)).toBe('One stop away')
  })
})
