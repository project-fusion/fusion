import './without-controls.css'

export function Example() {
  return (
    <helix-map
      controls="none"
      label="Edinburgh city center"
    >
      <helix-text
        scale="caption"
        slot="header"
      >
        Edinburgh city center
      </helix-text>

      <div className="stand-in">Map with its own controls</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
