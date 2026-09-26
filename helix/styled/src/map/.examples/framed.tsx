import './framed.css'

export function Example() {
  return (
    <helix-map label="Edinburgh city center">
      {/* Put your map here, drawn by MapLibre, Leaflet, an image, or a canvas. */}
      <div className="stand-in">Map</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
