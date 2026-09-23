import './framed.css'

export function Example() {
  return (
    <helix-map
      controls="pan fullscreen"
      controls-placement="bottom-end"
      id="city"
      label="Edinburgh city center"
    >
      <helix-text
        slot="header"
        variant="caption"
      >
        Edinburgh city center
      </helix-text>

      {/* Whatever draws the map goes here: MapLibre, Leaflet, an image tile, or
          a canvas of your own. Nothing in Helix draws one. */}
      <div className="stand-in">Your map renders here</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
