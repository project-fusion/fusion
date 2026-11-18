import './nested.css'

export function Example() {
  return (
    <helix-splitter default-position="25">
      <helix-card
        separation="plain"
        slot="start"
      >
        <helix-text>Files</helix-text>
      </helix-card>
      <helix-splitter
        default-position="65"
        orientation="vertical"
        slot="end"
      >
        <helix-splitter
          default-position="60"
          slot="start"
        >
          <helix-card
            separation="plain"
            slot="start"
          >
            <helix-text>Source</helix-text>
          </helix-card>
          <helix-card
            separation="plain"
            slot="end"
          >
            <helix-text>Outline</helix-text>
          </helix-card>
        </helix-splitter>
        <helix-card
          separation="plain"
          slot="end"
        >
          <helix-text>Terminal</helix-text>
        </helix-card>
      </helix-splitter>
    </helix-splitter>
  )
}
