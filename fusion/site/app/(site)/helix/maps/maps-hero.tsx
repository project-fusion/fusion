'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixActivateEvent, HelixMap, HelixMapRoute } from '@fusion.dev/helix'
import { colorsReady, connectMap, distancesAlong, motionOf } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { useEffect, useRef, useState } from 'react'
import { MAPS } from '@/content/maps/maps'
import { WALK } from '@/content/maps/routes'
import { stageAppearance } from '@/content/verticals/verticals'
import { boundsOf, clearOf } from '@/utils/map-view/map-view'
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

/** How long the whole walk takes, in milliseconds. */
const WALK_TIME = 60_000

/** How long the walker rests at the springs before walking again, in milliseconds. */
const REST = 4000

/** A stop's letter, in the order the arrow keys walk them: A for the first. */
const letter = (at: number): string => String.fromCharCode(65 + at)

/** The way from one place to the next, in degrees clockwise from north. */
const bearing = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
  const [a, b] = [from.lat, to.lat].map((one) => (one * Math.PI) / 180) as [number, number]
  const across = ((to.lng - from.lng) * Math.PI) / 180
  const east = Math.sin(across) * Math.cos(b)
  const north = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(across)
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360
}

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
  /* **The contrast the labels are held to**: a sent theme's own target while
     it is the one chosen, and the compiler's default otherwise. A ref rather
     than state, because the map reads it when it restyles and a render would
     only rebuild a map that restyles itself. */
  const labels = useRef<number | undefined>(sent?.settings.contrastTarget)
  const [brand, setBrand] = useState<string | null>(sent ? YOURS : null)
  const [mode, setMode] = useState<Mode>(sent?.settings.scheme ?? 'site')
  const [home, setHome] = useState<string>('')
  /* Whether the walker is walking, which the pause control decides; read by
     the map's own loop through a ref, so pausing does not remake the map. */
  const [walking, setWalking] = useState(true)
  const walkingRef = useRef(walking)
  walkingRef.current = walking
  /* Whether it moves at all, which a reader who asked for less motion
     decides, and which says whether there is a walk to pause. */
  const [still, setStill] = useState(false)
  useEffect(() => {
    setStill(matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

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
    let stopSeeing = (): void => undefined
    void (async () => {
      const { default: maplibregl } = await import('maplibre-gl')
      await customElements.whenDefined('helix-map')
      if (!live) {
        return
      }
      const language = document.documentElement.lang || 'en'
      /* The tokens can be a frame or two behind the page, so the map waits for
         them, and a page that never has them is told so by name. */
      const colors = await colorsReady(host)
      if (!live) {
        return
      }
      /* The labels held to the contrast chosen at the moment the map is
         styled, which a sent theme sets and a brand of the page's own clears. */
      const styled = (from: typeof colors) =>
        mapLibreStyle(from, { contrast: labels.current, language }) as never
      const map = new maplibregl.Map({
        attributionControl: false,
        bounds: BOUNDS,
        container: box,
        fitBoundsOptions: { padding: clearOf(box, panel.current) },
        style: styled(colors),
      })
      /* Framed again once it has drawn: the page is still settling the map's
         height when it is made, and a resize keeps the center, not the fit. */
      map.once('load', () => {
        map.fitBounds(BOUNDS, { animate: false, padding: clearOf(box, panel.current) })
      })
      const connection = connectMap(host, mapLibreDriver(map))
      /* **A walker along the route, on a loop, that a reader can stop.**
         Anything that moves by itself for more than five seconds beside the
         rest of a page needs a way to pause it, and this has one in the
         panel; it also rests while the map is off the screen or the tab is
         hidden, and stands at the start for a reader who asked for less
         motion. **It speaks on its first lap only**: which place it is
         walking to as it sets off for each, and that it has arrived, then
         once that it is going round again, and nothing after, since a loop
         that announced every leg forever would be a page that never stopped
         talking. The route behind it is drawn quieter than the route ahead. */
      const walker = host.querySelector('helix-map-position')
      const route = host.querySelector<HelixMapRoute>('helix-map-route:not([variant])')
      const [setOff, arrive] = [
        ...host.querySelectorAll<HelixMapRoute>('helix-map-route[variant="dotted"]'),
      ]
      let ticking = 0
      let onScreen = true
      const seen = new IntersectionObserver(([entry]) => {
        onScreen = entry?.isIntersecting ?? true
      })
      if (scope.current) {
        seen.observe(scope.current)
      }
      stopSeeing = () => seen.disconnect()
      if (walker) {
        /* Along the streets rather than across them: the path is the foot
           router's, and the walker keeps a steady pace by distance along it,
           turning with each street, so a long leg takes longer than a short
           one the way a walk does. */
        /* **The whole walk, from the first place's door to the last's**: the
           router's path in the middle, and the two dotted legs at its ends,
           from a place to where its path begins and from where it ends. */
        const first = PLACES[0] as (typeof PLACES)[number]
        const final = PLACES.at(-1) as (typeof PLACES)[number]
        const path: (readonly [number, number])[] = [
          [first.lat, first.lng],
          ...WALK.path,
          [final.lat, final.lng],
        ]
        /* The places along it: the first and the last where the markers are,
           the rest one on, the first place now leading the path. */
        const stops = [0, ...WALK.stops.slice(1, -1).map((stop) => stop + 1), path.length - 1]
        /* Measured as the connector cuts a route, so the part behind is
           quieter from exactly where the walker stands. */
        const along = distancesAlong(path.map(([lat, lng]) => ({ lat, lng })))
        const total = along.at(-1) ?? 0
        /** Stands the walker so far along the path, facing its way, the route behind it quieter. */
        const standAt = (covered: number): number => {
          /* The leg it is on: the last one once it has arrived, where no point
             lies further along, rather than the first, from which it was
             carried on past the springs and off the map for the whole rest. */
          const ahead = along.findIndex((distance) => distance > covered)
          const at = ahead === -1 ? path.length - 2 : Math.max(ahead - 1, 0)
          const [from, to] = [path[at], path[at + 1] ?? path[at]] as [
            readonly [number, number],
            readonly [number, number],
          ]
          const span = (along[at + 1] ?? covered) - (along[at] ?? 0)
          const part = span > 0 ? (covered - (along[at] ?? 0)) / span : 1
          walker.lat = from[0] + (to[0] - from[0]) * part
          walker.lng = from[1] + (to[1] - from[1]) * part
          if (span > 0) {
            walker.heading = bearing({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] })
          }
          /* **Everything behind the walker is quieter**, each line by how
             much of it is behind: the dotted first steps, the routed walk, and
             the dotted last steps, which are three lines and one journey. */
          const [routeStart, routeEnd] = [along[1] ?? 0, along[path.length - 2] ?? total]
          const behind = (from: number, to: number): number =>
            Math.min(Math.max((covered - from) / Math.max(to - from, 1e-9), 0), 1)
          if (setOff) {
            setOff.progress = behind(0, routeStart)
          }
          if (route) {
            route.progress = behind(routeStart, routeEnd)
          }
          if (arrive) {
            arrive.progress = behind(routeEnd, total)
          }
          return at
        }
        const walkingTo = (at: number): string =>
          `Walking to ${PLACES[stops.findIndex((stop) => stop > at)]?.label ?? ''}`
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          /* **Still, and partway**, for a reader who asked for less motion:
             everything a live position shows, its heading and the route behind
             it, without it moving, and not standing on the first place, whose
             letter it would hide for good. */
          walker.description = walkingTo(standAt(total * 0.35))
        } else {
          let elapsed = 0
          let last = performance.now()
          let lap = 0
          const step = (): void => {
            const now = performance.now()
            if (walkingRef.current && onScreen && document.visibilityState === 'visible') {
              elapsed += now - last
            }
            last = now
            if (elapsed >= WALK_TIME + REST) {
              elapsed = 0
              lap += 1
              if (lap === 1) {
                walker.description = 'Walking the route again, on a loop'
              }
              walker.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 480,
                easing: 'ease-out',
              })
            }
            const covered = Math.min(elapsed / WALK_TIME, 1) * total
            const at = standAt(covered)
            if (lap === 0) {
              walker.description =
                covered >= total ? `Arrived at ${PLACES.at(-1)?.label ?? ''}` : walkingTo(at)
            }
            ticking = window.setTimeout(step, 150)
          }
          step()
        }
      }
      /* Pressing a place is the page's to answer, and this one goes there, at
         the theme's own pace for a travel: its slow duration and emphasized
         curve, and a jump where the reader asked for less motion or the
         theme's durations are zero. */
      const visit = (event: HelixActivateEvent): void => {
        const place = PLACES.find((one) => one.label === event.detail.value)
        if (place) {
          const motion = motionOf(host, 'travel')
          map.easeTo({
            center: [place.lng, place.lat],
            padding: clearOf(box, panel.current),
            zoom: 15,
            ...(motion ? { duration: motion.duration, easing: motion.easing } : { duration: 0 }),
          })
        }
      }
      host.addEventListener('helix-activate', visit)
      /* **Restyled where its theme moves**: a brand or a mode painted on the
         scope, the site's own mode, or the reader's preference, and held to
         whichever contrast the labels are held to at that moment. */
      const theme = followTheme(map, host, styled)
      teardown = () => {
        clearTimeout(ticking)
        stopSeeing()
        theme.stop()
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
    /* **The mode as the token layer takes it**, which is `data-color-mode`:
       the site's `light-dark()` is compiled into a shim that resolves
       through it, so `color-scheme` alone moved the scrollbars and left
       every token on its light arm, and the switcher did nothing a reader
       could see unless a brand was picked, which paints its colors outright. */
    node.style.colorScheme = mode === 'site' ? '' : scheme
    if (mode === 'site') {
      delete node.dataset.colorMode
    } else {
      node.dataset.colorMode = scheme
    }
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
         drew 4px corners. **And marked for a mode of its own**, since the
         tokens are resolved where they are declared, so a mode set on this
         scope moves them only where they are declared again here. Unmarked
         when following the site in everything, whose own values at the root
         a re-derivation here would override. */
      node.toggleAttribute('data-helix-theme', Object.keys(values).length > 0 || mode !== 'site')
    }
    labels.current = brand === YOURS && sent ? sent.settings.contrastTarget : undefined
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
      data-color-mode={painted && sent ? sent.settings.scheme : undefined}
      data-helix-theme={painted && sent ? '' : undefined}
      ref={scope}
      style={
        painted && sent
          ? ({ ...painted, colorScheme: sent.settings.scheme } as React.CSSProperties)
          : undefined
      }
    >
      {/* **Gathered as the map zooms out**, so the seven places are one
          count over the city rather than seven names drawn over each other,
          and come apart again as it zooms in. */}
      <helix-map
        class={styles.mapsHeroFrame}
        cluster
        label="Austin, drawn in this theme"
        ref={frame}
      >
        <div className={styles.mapsCanvas} ref={container} />
        {/* The walk the arrow keys take, drawn: the renderer's own line under
            the street names, and named in the frame's list for a reader who
            cannot see it. */}
        <helix-map-position
          accuracy={25}
          description={`Setting off for ${PLACES[1]?.label ?? ''}`}
          label="A walker on the route"
          lat={PLACES[0]?.lat}
          lng={PLACES[0]?.lng}
        />
        <helix-map-route
          description="Through all seven places, in the order the arrow keys walk them"
          label="A walk from the university to the springs"
          points={WALK.path.map(([lat, lng]) => ({ lat, lng }))}
        />
        {/* **Dotted where it leaves the path**: a place set back from its
            road is where directions draw the last steps as dots, from where
            the route ends to the place itself, and the first steps the same. */}
        <helix-map-route
          label={`The first steps, from ${PLACES[0]?.label ?? ''} to the path`}
          points={[
            { lat: PLACES[0]?.lat ?? 0, lng: PLACES[0]?.lng ?? 0 },
            { lat: WALK.path[0]?.[0] ?? 0, lng: WALK.path[0]?.[1] ?? 0 },
          ]}
          variant="dotted"
        />
        <helix-map-route
          label={`The last steps, from the path to ${PLACES.at(-1)?.label ?? ''}`}
          points={[
            { lat: WALK.path.at(-1)?.[0] ?? 0, lng: WALK.path.at(-1)?.[1] ?? 0 },
            { lat: PLACES.at(-1)?.lat ?? 0, lng: PLACES.at(-1)?.lng ?? 0 },
          ]}
          variant="dotted"
        />
        {/* **Lettered in the order they are walked**, the letter seen and the
            place's name read: the stops rings in the walker's ink, and the
            end a red pin, the way directions draw where a journey ends. Red
            is the danger tone, chosen here for a destination as map apps
            choose it, and not a meaning the marker gives it. */}
        {PLACES.map((place, at) => {
          const last = at === PLACES.length - 1
          return (
            <helix-map-marker
              class={last ? undefined : styles.mapsStop}
              key={place.label}
              label={place.label}
              lat={place.lat}
              lng={place.lng}
              shape={last ? 'pin' : 'ring'}
              tone={last ? 'danger' : undefined}
            >
              <span slot="icon">{letter(at)}</span>
            </helix-map-marker>
          )
        })}
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
          {/* **The same control as the mode beside it**, since it is the same
              kind of choice: a button of its own drew a second label style
              and a second height in a row that had one of each. */}
          {still ? null : (
            <div className={styles.mapsControl}>
              <helix-toggle-group
                label="Walker"
                onChange={(event) => setWalking(event.currentTarget.value === 'walking')}
                value={walking ? 'walking' : 'paused'}
              >
                <helix-toggle value="walking">Walking</helix-toggle>
                <helix-toggle value="paused">Paused</helix-toggle>
              </helix-toggle-group>
            </div>
          )}
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
