import './preview.css'

export function Example() {
  return (
    <helix-headless-map label="Edinburgh city center">
      {/* Put your map here, drawn by MapLibre, Leaflet, an image, or a canvas. */}
      <div className="stand-in">Map</div>

      <span slot="attribution">© OpenStreetMap contributors</span>
    </helix-headless-map>
  )
}
