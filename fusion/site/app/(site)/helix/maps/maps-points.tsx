'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixActivateEvent, HelixMap } from '@fusion.dev/helix'
import { colorsReady, connectMap, fontReady, mapFontFrom } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { useEffect, useRef, useState } from 'react'
import { MAP_FAILED } from '@/content/maps/maps'
import { AUSTIN_PLACES, POINTS_VIEW } from '@/content/maps/points'
import { loadMapLibre } from '@/utils/maplibre/maplibre'
import styles from './maps.module.css'

/** Where the snapshot is served, which `app/maps/snapshot/points` draws. */
const SNAPSHOT = '/maps/snapshot/points'

/** How many, as the page's language writes a number. */
const COUNTED = AUSTIN_PLACES.toLocaleString('en-US')

/**
 * Every café, bar and restaurant in Austin as one points layer, on a map of
 * its own.
 *
 * **Made when it is nearly in view, and not before.** The hero has already
 * loaded MapLibre, so this is a second map rather than a second renderer, but
 * a map is still a canvas, a worker and a screen of tiles, and a reader who
 * never scrolls this far should not pay for it.
 *
 * **Its snapshot is asked for a little sooner**, from `SNAPSHOT`, and the map
 * is made only once that answer is in: the connector finds a snapshot when it
 * connects, so one that arrived after was never taken away, and stood over
 * the live map.
 *
 * **What was pressed is said under it**, the point's name through the same
 * `helix-activate` a marker sends, in a polite live region, so pressing one
 * does something a reader can see and hear without the demo opening panels.
 */
export function MapsPoints() {
  const frame = useRef<HelixMap>(null)
  const container = useRef<HTMLDivElement>(null)
  /* Said in the map's footer, where a failed load would leave an empty box. */
  const [failed, setFailed] = useState(false)
  const [pressed, setPressed] = useState('')
  /* The map drawn on the server at `POINTS_VIEW`, shown until MapLibre has
     drawn, and whether asking for it is over, however it went. */
  const [snapshot, setSnapshot] = useState('')
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    const box = container.current
    if (!box) {
      return
    }
    let live = true
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect()
          fetch(SNAPSHOT)
            .then((answer) => (answer.ok ? answer.text() : ''))
            .catch(() => '')
            .then((svg) => {
              if (live) {
                setSnapshot(svg)
                setAsked(true)
              }
            })
        }
      },
      { rootMargin: '800px' },
    )
    near.observe(box)
    return () => {
      live = false
      near.disconnect()
    }
  }, [])

  useEffect(() => {
    const host = frame.current
    const box = container.current
    if (!asked || !host || !box) {
      return
    }
    let live = true
    let teardown = (): void => undefined
    const start = async (): Promise<void> => {
      const maplibregl = await loadMapLibre()
      await customElements.whenDefined('helix-map')
      const colors = await colorsReady(host)
      /* The theme's typeface, loaded before the map draws a label in it. */
      await fontReady(mapFontFrom(host))
      if (!live) {
        return
      }
      const language = document.documentElement.lang || 'en'
      const style = (from: typeof colors) =>
        mapLibreStyle(from, { font: mapFontFrom(host), language }) as never
      const map = new maplibregl.Map({
        attributionControl: false,
        center: [POINTS_VIEW.center.lng, POINTS_VIEW.center.lat],
        container: box,
        style: style(colors),
        zoom: POINTS_VIEW.zoom,
      })
      const connection = connectMap(host, mapLibreDriver(map))
      const theme = followTheme(map, host, style)
      const said = (event: HelixActivateEvent): void => {
        setPressed(event.detail.value)
      }
      host.addEventListener('helix-activate', said)
      teardown = () => {
        host.removeEventListener('helix-activate', said)
        theme.stop()
        connection.disconnect()
        map.remove()
      }
    }
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect()
          start().catch(() => {
            if (live) {
              setFailed(true)
            }
          })
        }
      },
      { rootMargin: '400px' },
    )
    near.observe(box)
    return () => {
      live = false
      near.disconnect()
      teardown()
    }
  }, [asked])

  return (
    <div className={styles.mapsPoints}>
      <helix-map
        class={styles.mapsPointsFrame}
        label={`Food and drink in Austin, ${COUNTED} places`}
        ref={frame}
      >
        <div className={styles.mapsCanvas} ref={container} />
        {failed ? (
          <helix-text slot="footer" variant="caption">
            {MAP_FAILED}
          </helix-text>
        ) : null}
        {/* The streets before the map has drawn them; the points come with
            the map. */}
        {snapshot ? (
          <div
            className={styles.mapsSnapshot}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: an SVG this site drew on its server from map tiles
            dangerouslySetInnerHTML={{ __html: snapshot }}
            data-helix-map-snapshot=""
          />
        ) : null}
        <helix-map-points
          cluster
          description={`${COUNTED} places from OpenStreetMap`}
          label="Food and drink"
          src="/maps/austin-food-and-drink.geojson"
        />
      </helix-map>
      <helix-text aria-live="polite" emphasis="subtle" variant="caption">
        {pressed
          ? `Pressed: ${pressed}`
          : 'Press a count to zoom in. Press a point to see its name.'}
      </helix-text>
    </div>
  )
}
