'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixMap } from '@fusion.dev/helix'
import { colorsReady, connectMap, fontReady, mapFontFrom } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { useEffect, useRef, useState } from 'react'
import { RADAR } from '@/content/maps/maps'
import styles from './maps.module.css'

/** The lower 48 states, west-south then east-north, which the radar covers. */
const STATES: [[number, number], [number, number]] = [
  [-124.8, 24.4],
  [-66.9, 49.4],
]

/**
 * Weather radar across the United States for the last 50 minutes, on a map of
 * its own, with a button that plays it as a loop.
 *
 * **Paused on the latest frame until it is played**, as the Map reference's
 * weather example is: a loop that moves for more than five seconds needs a
 * way to stop it, and the button is that way before it is a way to start it.
 *
 * **Made when it is nearly in view, and not before**, as the other demos are.
 */
export function MapsRadar() {
  const frame = useRef<HelixMap>(null)
  const container = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

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
        attributionControl: false,
        bounds: STATES,
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
        label="Weather radar over the United States"
        ref={frame}
      >
        <div className={styles.mapsCanvas} ref={container} />
        <helix-map-raster
          attribution={RADAR.attribution}
          description="The last 50 minutes, in 10-minute steps"
          frames={RADAR.frames}
          label="Weather radar"
          playing={playing}
        />
      </helix-map>
      <helix-flex>
        <helix-button onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause radar' : 'Play radar'}
        </helix-button>
      </helix-flex>
    </div>
  )
}
