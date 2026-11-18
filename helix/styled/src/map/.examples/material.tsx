import './material.css'

export function Example() {
  return (
    <div className="materials">
      <helix-map label="Edinburgh city center">
        {/* Put your map here, drawn by MapLibre, Leaflet, an image, or a canvas. */}
        <div className="stand-in">Solid</div>

        <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
      </helix-map>

      <helix-map
        label="Glasgow city center"
        material="glass"
      >
        <div className="stand-in">Glass</div>

        <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
      </helix-map>

      <helix-map
        label="Aberdeen city center"
        material="frosted"
      >
        <div className="stand-in">Frosted</div>

        <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
      </helix-map>

      <helix-map
        label="Dundee city center"
        material="transparent"
      >
        <div className="stand-in">Transparent</div>

        <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
      </helix-map>
    </div>
  )
}
