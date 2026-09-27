import './buildings.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-map has the frame connect MapLibre and data-preview-map-view tilts it; on your page, connectMap does, and you set the view on your map. */}
      <helix-map
        controls="pan zoom rotate tilt fullscreen"
        data-preview-map
        data-preview-map-view="30.2672,-97.7431,15.6,55,-17"
        label="Downtown Austin in 3D"
      >
        <div data-preview-map-canvas></div>

        <helix-map-buildings></helix-map-buildings>
      </helix-map>
    </>
  )
}
