import './tailored.css'

export function Example() {
  return (
    <helix-map
      controls="pan fullscreen"
      controls-placement="bottom-end"
      label="Edinburgh city center"
    >
      {/* MapLibre, Leaflet and Google all draw zoom controls and none of them
          draws pan buttons, so this keeps the half they are missing and leaves
          the half they have. */}
      <div className="stand-in">Your map, with its own zoom controls</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
