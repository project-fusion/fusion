'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixActivateEvent, HelixMap } from '@fusion.dev/helix'
import { connectMap, type MapColors, mapColorsFrom } from '@fusion.dev/helix-map'
import { mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { useEffect, useRef, useState } from 'react'
import { MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import styles from './maps.module.css'

/**
 * Brands to try, picked to be far apart on the wheel rather than pretty
 * together, and a gray first: the map with no brand in it at all, which is
 * the one a reader comparing the others needs to compare them against.
 */
const BRANDS = [
  { hex: '#71717a', name: 'Neutral' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#e4572e', name: 'Coral' },
  { hex: '#ca8a04', name: 'Amber' },
  { hex: '#db2777', name: 'Pink' },
] as const

/**
 * Places on the opening view, in the order a reader walks them with the arrow
 * keys: along the waterfront and back through the middle of the city, which is
 * an order someone could follow on foot rather than one sorted by name.
 */
const PLACES = [
  { label: 'Palace of Fine Arts', lat: 37.8029, lng: -122.4484 },
  { label: 'Coit Tower', lat: 37.8024, lng: -122.4058 },
  { label: 'Ferry Building', lat: 37.7955, lng: -122.3937 },
  { label: 'Mission Dolores', lat: 37.7644, lng: -122.427 },
  { label: 'Twin Peaks', lat: 37.7544, lng: -122.4477 },
] as const

type Mode = 'site' | 'light' | 'dark'

/** The places' corners, west-south then east-north, as MapLibre takes a bounds. */
const BOUNDS: [[number, number], [number, number]] = [
  [Math.min(...PLACES.map((one) => one.lng)), Math.min(...PLACES.map((one) => one.lat))],
  [Math.max(...PLACES.map((one) => one.lng)), Math.max(...PLACES.map((one) => one.lat))],
]

/**
 * The part of the map a reader can see, as camera padding: where the panel
 * lies over it, the camera frames the places beside the panel rather than
 * under it, where a marker could take focus with nobody able to see it. The
 * right is wider for the frame's own controls in that corner.
 */
const clearOf = (
  frame: Element,
  panel: Element | null,
): { bottom: number; left: number; right: number; top: number } => {
  const edge = 48
  const room = frame.getBoundingClientRect()
  const over = panel?.getBoundingClientRect()
  const covers =
    over !== undefined &&
    over.left < room.right &&
    over.right > room.left &&
    over.top < room.bottom &&
    over.bottom > room.top
  return {
    bottom: edge,
    left: covers ? over.right - room.left + edge : edge,
    right: edge * 3,
    top: edge,
  }
}

/** The same four colors, which is when a restyle would draw nothing new. */
const same = (a: MapColors | undefined, b: MapColors): boolean =>
  a !== undefined &&
  a.foreground === b.foreground &&
  a.info === b.info &&
  a.success === b.success &&
  a.surface === b.surface

/**
 * The site's own brand, as the browser settles it at the root, for the swatch
 * that goes back to it: read inside the hero it would be whichever brand was
 * chosen last, since the hero is the scope the choice is painted on.
 */
const siteBrand = (): string => {
  const probe = document.createElement('span')
  probe.style.color = 'var(--helix-color-primary)'
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

/** Which scheme the page is showing, where a mode says to follow it. */
const siteScheme = (): 'dark' | 'light' => {
  const chosen = document.documentElement.dataset.colorMode
  if (chosen === 'dark' || chosen === 'light') {
    return chosen
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * The top of the Maps page: the map as the whole width of the page, with what
 * it is over it and two controls that re-theme it and nothing else.
 *
 * **The controls theme a scope, not the map.** A brand is derived by the same
 * engine the theme builder runs and painted onto the element around the
 * frame, and a mode sets that element's `color-scheme`, so the frame's own
 * buttons and credit strip change with the map rather than staying in the
 * site's colors around a map in someone else's. The map hears it the way it
 * hears the site's own theme change: its ancestors' styles moved.
 */
export function MapsHero() {
  const scope = useRef<HTMLDivElement>(null)
  const frame = useRef<HelixMap>(null)
  const container = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const engine = useRef<Promise<ThemeEngine> | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('site')
  const [home, setHome] = useState<string>('')

  useEffect(() => {
    setHome(siteBrand())
  }, [])

  /* The map, loaded after the page, and restyled when its colors move. */
  useEffect(() => {
    const host = frame.current
    const box = container.current
    if (!host || !box) {
      return
    }
    let live = true
    let teardown = (): void => undefined
    void (async () => {
      const { default: maplibregl } = await import('maplibre-gl')
      await customElements.whenDefined('helix-map')
      if (!live) {
        return
      }
      const language = document.documentElement.lang || 'en'
      let colors = mapColorsFrom(host)
      const map = new maplibregl.Map({
        attributionControl: false,
        bounds: BOUNDS,
        container: box,
        fitBoundsOptions: { padding: clearOf(box, panel.current) },
        style: mapLibreStyle(colors, { language }) as never,
      })
      const connection = connectMap(host, mapLibreDriver(map))
      /* Pressing a place is the page's to answer, and this one goes there.
         MapLibre already skips the glide for a reader who asked for less
         motion, since the move is not marked essential. */
      const visit = (event: HelixActivateEvent): void => {
        const place = PLACES.find((one) => one.label === event.detail.value)
        if (place) {
          map.easeTo({
            center: [place.lng, place.lat],
            padding: clearOf(box, panel.current),
            zoom: 15,
          })
        }
      }
      host.addEventListener('helix-activate', visit)
      let pending = 0
      const restyle = (): void => {
        cancelAnimationFrame(pending)
        pending = requestAnimationFrame(() => {
          const next = mapColorsFrom(host)
          if (!same(colors, next)) {
            colors = next
            map.setStyle(mapLibreStyle(colors, { language }) as never, { diff: true })
          }
        })
      }
      const watch = new MutationObserver((records) => {
        if (records.some((record) => (record.target as Node).contains(host))) {
          restyle()
        }
      })
      watch.observe(document.documentElement, {
        attributeFilter: ['data-color-mode', 'style', 'class'],
        attributes: true,
        subtree: true,
      })
      const scheme = matchMedia('(prefers-color-scheme: dark)')
      scheme.addEventListener('change', restyle)
      teardown = () => {
        cancelAnimationFrame(pending)
        watch.disconnect()
        scheme.removeEventListener('change', restyle)
        host.removeEventListener('helix-activate', visit)
        connection.disconnect()
        map.remove()
      }
    })()
    return () => {
      live = false
      teardown()
    }
  }, [])

  /* The scope, painted from the controls: nothing where both follow the site. */
  useEffect(() => {
    const node = scope.current
    if (!node) {
      return
    }
    for (const name of [...node.style]) {
      if (name.startsWith('--helix-')) {
        node.style.removeProperty(name)
      }
    }
    const scheme = mode === 'site' ? siteScheme() : mode
    node.style.colorScheme = mode === 'site' ? '' : scheme
    if (!brand) {
      return
    }
    let live = true
    engine.current ??= initTheme(THEME_ENGINE)
    void engine.current.then((loaded) => {
      if (!live) {
        return
      }
      const theme = loaded.derive({ brand, scheme })
      for (const token of theme.tokens) {
        node.style.setProperty(`--helix-${token.name}`, token.hex)
      }
      for (const [name, value] of Object.entries(theme.seeds)) {
        node.style.setProperty(`--helix-${name}`, value)
      }
    })
    return () => {
      live = false
    }
  }, [brand, mode])

  return (
    <div className={styles.mapsHero} ref={scope}>
      <helix-map
        class={styles.mapsHeroFrame}
        label="San Francisco, drawn in this theme"
        ref={frame}
      >
        <div className={styles.mapsCanvas} ref={container} />
        {PLACES.map((place) => (
          <helix-map-marker key={place.label} label={place.label} lat={place.lat} lng={place.lng} />
        ))}
      </helix-map>
      <div className={styles.mapsPanel} ref={panel}>
        <helix-flex align-items="center" data-density="sm" gap="xs">
          <helix-tag>Helix</helix-tag>
          <helix-tag tone={stageAppearance('Building')}>Building</helix-tag>
        </helix-flex>
        <helix-text as="h1">{MAPS.title}</helix-text>
        <helix-text as="p" emphasis="muted">
          {MAPS.lede}
        </helix-text>
        <div className={styles.mapsControls}>
          <fieldset className={styles.mapsControl}>
            <legend className={styles.mapsLegend}>Brand</legend>
            <div className={styles.mapsSwatches}>
              <button
                aria-label="This site's brand"
                aria-pressed={brand === null}
                className={styles.mapsSwatch}
                onClick={() => setBrand(null)}
                style={{ '--swatch': home } as React.CSSProperties}
                type="button"
              />
              {BRANDS.map((one) => (
                <button
                  aria-label={one.name}
                  aria-pressed={brand === one.hex}
                  className={styles.mapsSwatch}
                  key={one.hex}
                  onClick={() => setBrand(one.hex)}
                  style={{ '--swatch': one.hex } as React.CSSProperties}
                  type="button"
                />
              ))}
            </div>
          </fieldset>
          <div className={styles.mapsControl}>
            <helix-toggle-group
              label="Mode"
              onChange={(event) => setMode(event.currentTarget.value as Mode)}
              value={mode}
            >
              <helix-toggle value="site">Site</helix-toggle>
              <helix-toggle value="light">Light</helix-toggle>
              <helix-toggle value="dark">Dark</helix-toggle>
            </helix-toggle-group>
          </div>
        </div>
        {MAPS.blocks[0]?.body?.map((line) => (
          <helix-text emphasis="subtle" key={line} variant="caption">
            {line}
          </helix-text>
        ))}
      </div>
    </div>
  )
}
