import type { HelixMapPanEvent, HelixMapZoomEvent } from '@fusion.dev/helix'
import { useRef } from 'react'
import './events.css'

export function Example() {
  const ground = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0, zoom: 1 })

  /* The frame sends events and your code moves the map. Call your library here,
     such as `map.panBy` or `map.zoomIn`. The preview moves a grid. */
  const draw = () => {
    const box = ground.current
    if (!box) {
      return
    }
    box.style.setProperty('--_shift-x', `${at.current.x}px`)
    box.style.setProperty('--_shift-y', `${at.current.y}px`)
    box.style.setProperty('--_zoom', `${at.current.zoom}`)
  }

  const panned = (event: HelixMapPanEvent) => {
    // `by` is a fraction of the viewport width.
    const step = (ground.current?.clientWidth ?? 0) * event.detail.by
    if (event.detail.to === 'up') {
      at.current.y += step
    }
    if (event.detail.to === 'down') {
      at.current.y -= step
    }
    if (event.detail.to === 'start') {
      at.current.x += step
    }
    if (event.detail.to === 'end') {
      at.current.x -= step
    }
    draw()
  }

  const zoomed = (event: HelixMapZoomEvent) => {
    // `by` gives the direction: above 0 zooms in, below 0 zooms out.
    at.current.zoom = Math.min(
      Math.max(at.current.zoom * (event.detail.by > 0 ? 1.25 : 0.8), 0.5),
      4,
    )
    draw()
  }

  return (
    <helix-map
      label="City map"
      onhelix-map-pan={panned}
      onhelix-map-zoom={zoomed}
    >
      <div
        className="stand-in"
        ref={ground}
      >
        Pan and zoom with the buttons or the arrow keys
      </div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
