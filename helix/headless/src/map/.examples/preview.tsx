import './preview.css'

export function Example() {
  return (
    <helix-headless-map label="Edinburgh city center">
      {/* Whatever draws the map goes here: MapLibre, Leaflet, an image tile, or a
          canvas of your own. Nothing in Helix draws one. */}
      <div className="stand-in">Your map renders here</div>

      <span slot="attribution">© OpenStreetMap contributors</span>
    </helix-headless-map>
  )
}
