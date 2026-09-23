import type { HelixMapPanEvent, HelixMapZoomEvent } from '@fusion.dev/helix'
import { useRef } from 'react'
import './wired.css'

export function Example() {
  const ground = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0, zoom: 1 })

  /* Nothing in Helix moves a map: the frame asks and this answers. A real map
     would call its own library here, `map.panBy` or `map.zoomIn`; the stand-in
     moves a grid, which is the same shape of answer with nothing to install. */
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
    // `by` is a fraction of the viewport, so the step is the same gesture at
    // any scale. A real map multiplies it by whatever it measures in.
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
    // A direction rather than a level, because the scale is yours.
    at.current.zoom = Math.min(
      Math.max(at.current.zoom * (event.detail.by > 0 ? 1.25 : 0.8), 0.5),
      4,
    )
    draw()
  }

  return (
    <helix-map
      label="A map that answers its own controls"
      onhelix-map-pan={panned}
      onhelix-map-zoom={zoomed}
    >
      <div
        className="stand-in"
        ref={ground}
      >
        Pan and zoom with the controls, or the arrow keys
      </div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
