import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * What a review of the Map frame found, each held here by what it does.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = Updatable & {
  idleDelay: number
  mapType?: string
  moved: () => void
  pan: (to: 'up' | 'down' | 'start' | 'end') => void
}

type Marker = Updatable & {
  current: boolean
  gathered: string[]
  gatheredBy?: Marker
}

const region = (host: Element): HTMLElement =>
  host.shadowRoot?.querySelector('[part="region"]') as HTMLElement

const press = (target: HTMLElement, init: KeyboardEventInit): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

describe('a map a server rendered', () => {
  /* A shadow root already there as the element connects is how a server's
     declarative one arrives, which is what makes the first update a
     hydration: it reads no children, and the next render has to. */
  test('draws its markers and layers once it knows them', async () => {
    const host = document.createElement('helix-headless-map') as Frame
    host.attachShadow({ mode: 'open' })
    host.innerHTML = `<helix-headless-map-marker label="Capitol" lat="30.27" lng="-97.74"></helix-headless-map-marker>
      <helix-headless-map-route label="Walk" points="30.27,-97.74 30.26,-97.73"></helix-headless-map-route>`
    document.body.append(host)
    await settle(host)
    await settle(host)
    const marker = host.querySelector('helix-headless-map-marker') as Marker
    await settle(marker)
    expect(marker.current).toBe(true)
    expect(host.shadowRoot?.querySelector('[part="layers"]')?.textContent).toContain('Walk')
    host.remove()
  })
})

describe('keys that belong to someone else', () => {
  test('page zoom and Back are left to the browser', async () => {
    const host = (await mount('<helix-headless-map label="City"></helix-headless-map>')) as Frame
    const heard: string[] = []
    host.addEventListener('helix-map-zoom', () => heard.push('zoom'))
    host.addEventListener('helix-map-pan', () => heard.push('pan'))
    const zoom = press(region(host), { ctrlKey: true, key: '=' })
    const back = press(region(host), { altKey: true, key: 'ArrowLeft' })
    const command = press(region(host), { key: '-', metaKey: true })
    expect(heard).toEqual([])
    expect([zoom.defaultPrevented, back.defaultPrevented, command.defaultPrevented]).toEqual([
      false,
      false,
      false,
    ])
    press(region(host), { key: '=' })
    expect(heard).toEqual(['zoom'])
  })
})

describe('the header and footer', () => {
  test('stay when the pointer leaves, with no wait set', async () => {
    const host = (await mount('<helix-headless-map label="City"></helix-headless-map>')) as Frame
    region(host).dispatchEvent(new PointerEvent('pointerleave'))
    await settle(host)
    expect(hasState(host, 'idle')).toBe(false)
  })

  test('go when it leaves, with a wait set', async () => {
    const host = (await mount(
      '<helix-headless-map label="City" idle-delay="2000"></helix-headless-map>',
    )) as Frame
    region(host).dispatchEvent(new PointerEvent('pointerleave'))
    await settle(host)
    expect(hasState(host, 'idle')).toBe(true)
  })
})

describe('the same move said again', () => {
  test('is heard every time', async () => {
    const host = (await mount('<helix-headless-map label="City"></helix-headless-map>')) as Frame
    const said: string[] = []
    /* Three, since the third is the one that was lost, each past the wait the
       frame gives the view to settle. */
    for (let time = 0; time < 3; time += 1) {
      host.pan('start')
      host.moved()
      await new Promise((done) => setTimeout(done, 450))
      await settle(host)
      said.push(host.shadowRoot?.querySelector('[part="live"]')?.textContent ?? '')
    }
    /* Each differs from the one before, so each is a change the region is heard for. */
    for (let at = 1; at < said.length; at += 1) {
      expect(said[at]).not.toBe(said[at - 1])
      expect(said[at]?.trim()).toBe('Moved left')
    }
  })
})

describe('the marker walk', () => {
  test('keeps its stop off a marker with no place', async () => {
    const host = await mount(`<helix-headless-map label="City">
      <helix-headless-map-marker label="Nowhere"></helix-headless-map-marker>
      <helix-headless-map-marker label="Capitol" lat="30.27" lng="-97.74"></helix-headless-map-marker>
    </helix-headless-map>`)
    await settle(host as Updatable)
    const [nowhere, capitol] = [...host.querySelectorAll('helix-headless-map-marker')] as Marker[]
    expect(nowhere?.current).toBe(false)
    expect(capitol?.current).toBe(true)
  })

  test('hands focus to the cluster a focused place is gathered into', async () => {
    const host = await mount(`<helix-headless-map label="City">
      <helix-headless-map-marker label="Hotel" lat="30.27" lng="-97.74"></helix-headless-map-marker>
      <helix-headless-map-marker label="Hotel café" lat="30.27" lng="-97.74"></helix-headless-map-marker>
    </helix-headless-map>`)
    await settle(host as Updatable)
    const [lead, other] = [...host.querySelectorAll('helix-headless-map-marker')] as Marker[]
    ;(other as unknown as HTMLElement).focus()
    expect(other?.shadowRoot?.activeElement).not.toBeNull()
    ;(lead as Marker).gathered = ['Hotel', 'Hotel café']
    ;(other as Marker).gatheredBy = lead as Marker
    await settle(other as Marker)
    await settle(lead as Marker)
    expect(lead?.shadowRoot?.activeElement).not.toBeNull()
  })

  /* Measured in Chromium with MapLibre drawing tiles: removing the focused
     marker left `document.activeElement` on the body. */
  const city = async (): Promise<{ host: Element; markers: Marker[] }> => {
    const host = await mount(`<helix-headless-map label="City">
      <helix-headless-map-marker label="Capitol" lat="30.27" lng="-97.74"></helix-headless-map-marker>
      <helix-headless-map-marker label="Library" lat="30.26" lng="-97.75"></helix-headless-map-marker>
      <helix-headless-map-marker label="Bridge" lat="30.25" lng="-97.74"></helix-headless-map-marker>
    </helix-headless-map>`)
    await settle(host as Updatable)
    return { host, markers: [...host.querySelectorAll('helix-headless-map-marker')] as Marker[] }
  }
  const focusIn = (one: Element | undefined): boolean =>
    one?.shadowRoot?.activeElement !== null && one?.shadowRoot?.activeElement !== undefined

  test('hands focus to the next place when the page takes the focused one away', async () => {
    const { host, markers } = await city()
    const [, library, bridge] = markers as [Marker, Marker, Marker]
    ;(library as unknown as HTMLElement).focus()
    ;(library as unknown as HTMLElement).remove()
    await settle(host as Updatable)
    expect(focusIn(bridge as unknown as Element)).toBe(true)
    expect(bridge.current).toBe(true)
  })

  test('to the one before where the last was taken away, and to the map where none is left', async () => {
    const { host, markers } = await city()
    const [capitol, library, bridge] = markers as [Marker, Marker, Marker]
    ;(bridge as unknown as HTMLElement).focus()
    ;(bridge as unknown as HTMLElement).remove()
    await settle(host as Updatable)
    expect(focusIn(library as unknown as Element)).toBe(true)
    ;(capitol as unknown as HTMLElement).remove()
    ;(library as unknown as HTMLElement).remove()
    await settle(host as Updatable)
    expect(host.shadowRoot?.activeElement).toBe(region(host))
  })

  test('leaves focus where the reader put it when a marker they left is taken away', async () => {
    const { host, markers } = await city()
    const [capitol, library] = markers as [Marker, Marker, Marker]
    const after = document.createElement('button')
    document.body.append(after)
    try {
      ;(library as unknown as HTMLElement).focus()
      after.focus()
      ;(library as unknown as HTMLElement).remove()
      await settle(host as Updatable)
      expect(document.activeElement).toBe(after)
      expect(focusIn(capitol as unknown as Element)).toBe(false)
    } finally {
      after.remove()
    }
  })
})

describe('imagery of the ground', () => {
  test('follows the map type without writing onto the layer', async () => {
    const host = (await mount(`<helix-headless-map label="City">
      <helix-headless-map-raster ground label="Aerial" src="https://example.com/{z}/{x}/{y}.png"></helix-headless-map-raster>
    </helix-headless-map>`)) as Frame
    await settle(host)
    const raster = host.querySelector('helix-headless-map-raster') as HTMLElement
    const listed = (): string =>
      host.shadowRoot?.querySelector('[part="layers"]')?.textContent ?? ''
    expect(raster.hasAttribute('hidden')).toBe(false)
    expect(listed()).not.toContain('Aerial')
    host.mapType = 'hybrid'
    await settle(host)
    expect(listed()).toContain('Aerial')
    expect(raster.hasAttribute('hidden')).toBe(false)
  })
})

describe('a layer with no name', () => {
  test('is named by its kind in the list', async () => {
    const host = await mount(`<helix-headless-map label="City">
      <helix-headless-map-route points="30.27,-97.74 30.26,-97.73"></helix-headless-map-route>
    </helix-headless-map>`)
    await settle(host as Updatable)
    expect(host.shadowRoot?.querySelector('[part="layer"]')?.textContent?.trim()).toBe('Route')
  })
})

describe('radar moved in the page', () => {
  test('plays on', async () => {
    const host = await mount(`<helix-headless-map label="City">
      <helix-headless-map-raster playing interval="100"></helix-headless-map-raster>
    </helix-headless-map>`)
    const raster = host.querySelector('helix-headless-map-raster') as Updatable & {
      frame?: number
      frames?: string[]
    }
    raster.frames = ['a/{z}/{x}/{y}', 'b/{z}/{x}/{y}', 'c/{z}/{x}/{y}']
    await settle(raster)
    const holder = document.createElement('div')
    document.body.append(holder)
    holder.append(raster)
    const before = raster.frame
    await new Promise((done) => setTimeout(done, 350))
    expect(raster.frame).not.toBe(before)
    holder.remove()
  })
})
