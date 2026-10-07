import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Map on the words registry: the frame, its layers, its points and its
 * markers each speak the words registered for the page's language, its counts
 * and degrees take plural forms, and a passed place is one sentence.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Frame = Updatable & {
  bearing: number
  moved: () => void
  pitch: number
  rotate: (by: number) => void
  tilt: (by: number) => void
}

type Marker = Updatable & { gathered: string[]; passed: boolean }

type Walking = Updatable & {
  walk: { count?: number; key: string; label?: string; value?: string; x: number; y: number }[]
}

/** A map in a container whose attributes set the page's language. */
const frame = async (around = '', inside = '', extra = ''): Promise<Frame> => {
  document.body.innerHTML = `<div ${around}><helix-headless-map label="City" ${extra}>${inside}</helix-headless-map></div>`
  const host = document.querySelector('helix-headless-map') as Frame
  await settle(host)
  return host
}

const said = (host: Frame): string => part(host, 'live')?.textContent?.trim() ?? ''

/** Longer than the frame waits for the view to settle. */
const settled = async (host: Frame): Promise<void> => {
  await new Promise((done) => setTimeout(done, 500))
  await settle(host)
}

const POLISH = {
  'helix-map': {
    controlsLabel: 'Sterowanie mapą',
    tiltedLabel:
      '{degrees, plural, one {Nachylono o # stopień} few {Nachylono o # stopnie} many {Nachylono o # stopni} other {Nachylono o # stopnia}}',
    zoomInLabel: 'Przybliż',
  },
  'helix-map-marker': { passedLabel: '{label} (miniony)' },
  'helix-map-points': {
    countLabel:
      '{count, plural, one {# miejsce} few {# miejsca} many {# miejsc} other {# miejsca}}',
    label: 'Miejsca',
  },
}

describe('the degrees a map says', () => {
  test('say one degree in the singular', async () => {
    const host = await frame()
    host.tilt(1)
    host.pitch = 1
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Tilted 1 degree')
  })

  test('take the forms the language has', async () => {
    registerWords('pl', POLISH)
    const host = await frame('lang="pl"')
    host.tilt(1)
    host.pitch = 22
    host.moved()
    await settled(host)
    expect(said(host)).toBe('Nachylono o 22 stopnie')
  })
})

describe('a map on a page in another language', () => {
  test('names its controls with the words registered for it', async () => {
    registerWords('pl', POLISH)
    const host = await frame('lang="pl"')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Sterowanie mapą')
    expect(part(host, 'zoom-in')?.getAttribute('aria-label')).toBe('Przybliż')
  })

  test('keeps its own English where nothing is registered', async () => {
    const host = await frame('lang="pl"')
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Map controls')
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('City')
  })

  test('names itself with its word where it has no `label`', async () => {
    registerWords('pl', { 'helix-map': { fallbackLabel: 'Mapa' } })
    document.body.innerHTML = '<div lang="pl"><helix-headless-map></helix-headless-map></div>'
    const host = document.querySelector('helix-headless-map') as Frame
    await settle(host)
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Mapa')
  })

  test('counts the places a point stands for in the language’s forms', async () => {
    registerWords('pl', POLISH)
    const host = await frame('lang="pl"', '<helix-headless-map-points></helix-headless-map-points>')
    const points = host.querySelector('helix-headless-map-points') as Walking
    points.walk = [
      { count: 5, key: 'c:1', x: 40, y: 20 },
      { count: 1234, key: 'c:2', x: 60, y: 20 },
    ]
    await settle(points)
    const places = [...(points.shadowRoot?.querySelectorAll('[part~="place"]') ?? [])]
    expect(places.map((one) => one.textContent)).toEqual(['5 miejsc', '1234 miejsca'])
    expect(part(points, 'places')?.getAttribute('aria-label')).toBe('Miejsca')
  })

  test('says a passed place in one sentence the language orders', async () => {
    registerWords('pl', POLISH)
    const host = await frame(
      'lang="pl"',
      '<helix-headless-map-marker label="Dworzec" lat="1" lng="1"></helix-headless-map-marker>',
    )
    const marker = host.querySelector('helix-headless-map-marker') as Marker
    marker.passed = true
    await settle(marker)
    expect(part(marker, 'label')?.textContent).toBe('Dworzec (miniony)')
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await frame('lang="pl"')
    registerWords('pl', POLISH)
    await Promise.resolve()
    await settle(host)
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Sterowanie mapą')
  })
})

describe('a passed place', () => {
  test('is followed by a page’s word that does not hold the name, as before', async () => {
    const host = await frame(
      '',
      '<helix-headless-map-marker label="Depot" lat="1" lng="1" passed-label="visited"></helix-headless-map-marker>',
    )
    const marker = host.querySelector('helix-headless-map-marker') as Marker
    marker.passed = true
    await settle(marker)
    expect(part(marker, 'label')?.textContent).toBe('Depot, visited')
  })
})
