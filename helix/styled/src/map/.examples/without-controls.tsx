import './without-controls.css'

export function Example() {
  return (
    <helix-map
      controls="none"
      label="Edinburgh city center"
    >
      <helix-text
        slot="header"
        variant="caption"
      >
        Edinburgh city center
      </helix-text>

      <div className="stand-in">Map with its own controls</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
