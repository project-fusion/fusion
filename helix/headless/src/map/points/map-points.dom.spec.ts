import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = HTMLElement & { updateComplete: Promise<boolean> }
type Points = HTMLElement & { data?: unknown; updateComplete: Promise<boolean> }

describe('map points', () => {
  test('points set as data say so, and are named in the frame’s list as a route is', async () => {
    const host = (await mount(
      `<helix-headless-map label="Austin">
        <helix-headless-map-points label="Food and drink" description="3,252 places"></helix-headless-map-points>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    const points = host.querySelector('helix-headless-map-points') as Points
    const said: string[] = []
    host.addEventListener('helix-map-part-change', (event) => said.push(event.detail.kind))
    points.data = [{ label: 'Cafe', lat: 1, lng: 2 }]
    await points.updateComplete
    expect(said).toEqual(['layer'])
    expect(part(host, 'layer')?.textContent).toBe('Food and drink, 3,252 places')
  })
})

describe('map points in view', () => {
  type Walking = Points & {
    walk: { count?: number; key: string; label?: string; value?: string; x: number; y: number }[]
  }

  const walking = async (): Promise<{ host: Frame; points: Walking }> => {
    const host = (await mount(
      `<helix-headless-map label="Austin" lang="en">
        <helix-headless-map-points label="Food and drink"></helix-headless-map-points>
      </helix-headless-map>`,
    )) as Frame
    await host.updateComplete
    const points = host.querySelector('helix-headless-map-points') as Walking
    points.walk = [
      { key: 'p:0', label: 'Fleet Coffee', value: 'fleet', x: 10, y: 10 },
      { count: 12, key: 'c:7', x: 40, y: 20 },
      { key: 'p:2', label: 'Jupiter', value: 'jupiter', x: 80, y: 60 },
    ]
    await points.updateComplete
    return { host, points }
  }

  const places = (points: Walking): HTMLElement[] => [
    ...(points.shadowRoot?.querySelectorAll<HTMLElement>('[part~="place"]') ?? []),
  ]

  const press = (target: HTMLElement, key: string, type = 'keydown'): void => {
    target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, composed: true, key }))
  }

  test('each point and count in view is a button named by its place, one of them the tab stop', async () => {
    const { points } = await walking()
    const buttons = places(points)
    expect(buttons.map((one) => one.textContent)).toEqual(['Fleet Coffee', '12 places', 'Jupiter'])
    expect(buttons.map((one) => one.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(buttons[1]?.getAttribute('part')).toBe('place count')
    expect(part(points, 'places')?.getAttribute('aria-label')).toBe('Food and drink')
  })

  test('the arrow keys walk them in order, and Enter presses a point or opens a count', async () => {
    const { host, points } = await walking()
    const pressed: string[] = []
    host.addEventListener('helix-activate', (event) => pressed.push(event.detail.value))
    host.addEventListener('helix-map-cluster', (event) => pressed.push(`count ${event.detail.key}`))
    const [fleet] = places(points) as [HTMLElement]
    press(fleet, 'Enter')
    press(fleet, 'ArrowRight')
    await points.updateComplete
    expect(places(points).map((one) => one.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    press(places(points)[1] as HTMLElement, 'Enter')
    press(places(points)[1] as HTMLElement, 'End')
    await points.updateComplete
    press(places(points)[2] as HTMLElement, ' ')
    press(places(points)[2] as HTMLElement, ' ', 'keyup')
    expect(pressed).toEqual(['fleet', 'count c:7', 'jupiter'])
  })

  test('a focused count gone from view hands the focus to what stands nearest where it was', async () => {
    const { points } = await walking()
    const count = places(points)[1] as HTMLElement
    count.focus()
    points.walk = [
      { key: 'p:0', label: 'Fleet Coffee', value: 'fleet', x: 10, y: 10 },
      { key: 'p:5', label: 'Cafe Nearby', value: 'nearby', x: 42, y: 24 },
      { key: 'p:2', label: 'Jupiter', value: 'jupiter', x: 80, y: 60 },
    ]
    await points.updateComplete
    await points.updateComplete
    expect(points.shadowRoot?.activeElement?.textContent).toBe('Cafe Nearby')
  })
})
