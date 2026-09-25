'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixActivateEvent, HelixMap } from '@fusion.dev/helix'
import { connectMap, mapColorsFrom } from '@fusion.dev/helix-map'
import { mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { useEffect, useRef, useState } from 'react'
import { MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { boundsOf, clearOf, sameColors } from '@/utils/map-view/map-view'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import styles from './maps.module.css'
import { mapIntent, propertiesOf, type SentTheme } from './maps-theme'

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
 * keys: down from the university through downtown to the river, then west
 * along it to the springs, which is an order someone could follow on foot
 * rather than one sorted by name. Coordinates are OpenStreetMap's.
 */
const PLACES = [
  { label: 'UT Tower', lat: 30.28607, lng: -97.73935 },
  { label: 'Texas Capitol', lat: 30.27469, lng: -97.74051 },
  { label: 'Franklin Barbecue', lat: 30.27014, lng: -97.73128 },
  { label: 'Rainey Street', lat: 30.259, lng: -97.73869 },
  { label: 'Congress Avenue Bridge', lat: 30.26139, lng: -97.74529 },
  { label: 'Terry Black’s Barbecue', lat: 30.25976, lng: -97.75487 },
  { label: 'Barton Springs Pool', lat: 30.26384, lng: -97.77014 },
] as const

type Mode = 'site' | 'light' | 'dark'

/** The brand choice that is a whole theme from the builder rather than a color. */
const YOURS = 'yours'

/** The places' corners, as the camera frames them. */
const BOUNDS = boundsOf(PLACES)

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
export function MapsHero({
  painted,
  sent,
}: {
  /** The sent theme as the server derived it, so it is in the first paint. */
  painted?: Record<string, string>
  /** A theme the builder sent, which the page opens in. */
  sent?: SentTheme
}) {
  const scope = useRef<HTMLDivElement>(null)
  const frame = useRef<HelixMap>(null)
  const container = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const engine = useRef<Promise<ThemeEngine> | null>(null)
  const [brand, setBrand] = useState<string | null>(sent ? YOURS : null)
  const [mode, setMode] = useState<Mode>(sent?.settings.scheme ?? 'site')
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
      /* Framed again once it has drawn: the page is still settling the map's
         height when it is made, and a resize keeps the center, not the fit. */
      map.once('load', () => {
        map.fitBounds(BOUNDS, { animate: false, padding: clearOf(box, panel.current) })
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
          if (!sameColors(colors, next)) {
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

  /* The scope, painted from the controls: nothing where both follow the site.
     **Swapped in one step, once the new values exist**, rather than cleared and
     repainted: the engine loads asynchronously, and clearing first showed the
     site's theme for a moment between any two choices, and on arrival between
     the server's paint of a sent theme and the same values derived again. */
  useEffect(() => {
    const node = scope.current
    if (!node) {
      return
    }
    const scheme = mode === 'site' ? siteScheme() : mode
    node.style.colorScheme = mode === 'site' ? '' : scheme
    const paint = (values: Record<string, string>): void => {
      for (const name of [...node.style]) {
        if (name.startsWith('--helix-') && !(name in values)) {
          node.style.removeProperty(name)
        }
      }
      for (const [name, value] of Object.entries(values)) {
        node.style.setProperty(name, value)
      }
      /* **Marked as a theme, or the seeds are read by nothing.** The radii,
         the spacing and the series colors are derived from the seeds by
         `helix/styles` wherever `data-helix-theme` is, and only there: painted
         on an unmarked scope they sat unread and a sent radius of 90 still
         drew 4px corners. Unmarked when following the site, whose own values
         at the root a re-derivation here would override. */
      node.toggleAttribute('data-helix-theme', Object.keys(values).length > 0)
    }
    const intent =
      brand === YOURS && sent ? mapIntent(sent.settings, scheme) : brand ? { brand, scheme } : null
    if (!intent) {
      paint({})
      return
    }
    let live = true
    engine.current ??= initTheme(THEME_ENGINE)
    void engine.current.then((loaded) => {
      if (live) {
        paint(propertiesOf(loaded.derive(intent)))
      }
    })
    return () => {
      live = false
    }
  }, [brand, mode, sent])

  return (
    <div
      className={styles.mapsHero}
      data-helix-theme={painted && sent ? '' : undefined}
      ref={scope}
      style={
        painted && sent
          ? ({ ...painted, colorScheme: sent.settings.scheme } as React.CSSProperties)
          : undefined
      }
    >
      <helix-map class={styles.mapsHeroFrame} label="Austin, drawn in this theme" ref={frame}>
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
              {sent ? (
                <button
                  aria-label="Your theme, from the theme builder"
                  aria-pressed={brand === YOURS}
                  className={styles.mapsSwatch}
                  onClick={() => setBrand(YOURS)}
                  style={{ '--swatch': sent.settings.brand } as React.CSSProperties}
                  type="button"
                />
              ) : null}
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
        {/* What the first swatch is, in words: a color alone does not say it is
            a whole theme, or where it came from, or that there is a way back. */}
        {sent ? (
          <helix-text variant="caption">
            Opened with your theme from the builder.{' '}
            <a data-link="true" href={`/helix/theme?${sent.query}`}>
              Back to the theme builder
            </a>
          </helix-text>
        ) : null}
        {MAPS.blocks[0]?.body?.map((line) => (
          <helix-text emphasis="subtle" key={line} variant="caption">
            {line}
          </helix-text>
        ))}
      </div>
    </div>
  )
}
