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

      {/* What this frame is still doing is the part that matters: a slotted map
          is a canvas with no name and no node in the accessibility tree, and a
          named region is the difference between a reader meeting it and never
          finding it. */}
      <div className="stand-in">Your map, with the controls it already has</div>

      <helix-text slot="attribution">© OpenStreetMap contributors</helix-text>
    </helix-map>
  )
}
