'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixMap } from '@fusion.dev/helix'
import { colorsReady, connectMap, fontReady, mapFontFrom } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { useEffect, useRef } from 'react'
import { ELEVATION, IMAGERY } from '@/content/maps/maps'
import styles from './maps.module.css'

/** Yosemite Valley from the west, El Capitan in front and Half Dome at the far end. */
const VALLEY = { bearing: 70, center: [-119.61, 37.73] as [number, number], pitch: 60, zoom: 12.4 }

/**
 * Yosemite Valley raised in 3D, on a map of its own: terrain, contour lines,
 * and land cover, with satellite imagery as a map type in the layers menu.
 *
 * **Made when it is nearly in view, and not before**, as the points demo is:
 * raised terrain is elevation tiles and a mesh on top of the map's own tiles,
 * and a reader who never scrolls this far should not pay for them.
 */
export function MapsTerrain() {
  const frame = useRef<HelixMap>(null)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = frame.current
    const box = container.current
    if (!host || !box) {
      return
    }
    let live = true
    let teardown = (): void => undefined
    const start = async (): Promise<void> => {
      const { default: maplibregl } = await import('maplibre-gl')
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
        ...VALLEY,
        attributionControl: false,
        container: box,
        style: style(colors),
      })
      const connection = connectMap(host, mapLibreDriver(map))
      const theme = followTheme(map, host, style)
      teardown = () => {
        theme.stop()
        connection.disconnect()
        map.remove()
      }
    }
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect()
          void start()
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
  }, [])

  return (
    <div className={styles.mapsDemo}>
      <helix-map
        class={styles.mapsDemoFrame}
        controls="zoom compass tilt layers fullscreen"
        label="Yosemite Valley in 3D"
        ref={frame}
      >
        <div className={styles.mapsCanvas} ref={container} />
        <helix-map-raster
          attribution={IMAGERY.attribution}
          ground
          label="Satellite imagery"
          max-zoom="16"
          opacity={1}
          src={IMAGERY.src}
        />
        <helix-map-landcover />
        <helix-map-terrain
          attribution={ELEVATION.attribution}
          max-zoom="15"
          raised
          src={ELEVATION.src}
        />
        <helix-map-contours max-zoom="15" src={ELEVATION.src} unit="feet" />
      </helix-map>
      <helix-text emphasis="subtle" variant="caption">
        Press 3D to lay the valley flat. Open the layers menu for satellite imagery.
      </helix-text>
    </div>
  )
}
