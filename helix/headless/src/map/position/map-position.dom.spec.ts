import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Position = HTMLElement & {
  announceEvery: number
  description?: string
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
})
