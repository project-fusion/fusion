'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { HelixMap } from '@fusion.dev/helix'
import { connectMap, type MapColors, mapColorsFrom } from '@fusion.dev/helix-map'
import { mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { useEffect, useRef } from 'react'
import styles from './maps.module.css'

/** The same four colors, which is when a restyle would draw nothing new. */
const same = (a: MapColors | undefined, b: MapColors): boolean =>
  a !== undefined &&
  a.foreground === b.foreground &&
  a.info === b.info &&
  a.success === b.success &&
  a.surface === b.surface

/**
 * A map in this site's theme, which follows the theme as it changes.
 *
 * **Loaded after the page**, because MapLibre is most of a megabyte and a
 * reader who never scrolls to it should not pay for it, and because it needs
 * WebGL, which a server render has none of.
 *
 * **Restyled when the colors move, and only then.** The palette is painted
 * as inline properties on the root and on the scope around the page, and the
 * color mode is an attribute on the root, so what is watched is those on this
 * frame's ancestors: MapLibre writes styles inside its own container on every
 * frame, and hearing those would restyle a map that has not changed.
 */
export function MapsDemo() {
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
    void (async () => {
      const { default: maplibregl } = await import('maplibre-gl')
      await customElements.whenDefined('helix-map')
      if (!live) {
        return
      }
      let colors = mapColorsFrom(host)
      const map = new maplibregl.Map({
        attributionControl: false,
        center: [-122.4194, 37.7749],
        container: box,
        style: mapLibreStyle(colors, { language: document.documentElement.lang || 'en' }) as never,
        zoom: 12,
      })
      const connection = connectMap(host, mapLibreDriver(map))

      let pending = 0
      const restyle = (): void => {
        cancelAnimationFrame(pending)
        pending = requestAnimationFrame(() => {
          const next = mapColorsFrom(host)
          if (same(colors, next)) {
            return
          }
          colors = next
          map.setStyle(
            mapLibreStyle(colors, { language: document.documentElement.lang || 'en' }) as never,
            {
              diff: true,
            },
          )
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
        connection.disconnect()
        map.remove()
      }
    })()
    return () => {
      live = false
      teardown()
    }
  }, [])

  return (
    <helix-map
      class={styles.mapsFrame}
      label="San Francisco, drawn in this site's theme"
      ref={frame}
    >
      <div className={styles.mapsCanvas} ref={container} />
    </helix-map>
  )
}
