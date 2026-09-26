import './controls-and-placement.css'

export function Example() {
  return (
    <helix-map
      controls="pan fullscreen"
      controls-placement="bottom-end"
      label="Edinburgh city center"
    >
      {/* Your map library draws the zoom buttons, so the frame shows pan and
          fullscreen only. */}
      <div className="stand-in">Map with its own zoom buttons</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
