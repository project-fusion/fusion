export function Example() {
  return (
    <helix-splitter
      default-position="60"
      orientation="vertical"
      style={{ blockSize: '14rem' }}
    >
      <helix-card
        separation="plain"
        slot="start"
      >
        <helix-text>Preview</helix-text>
      </helix-card>
      <helix-card
        separation="plain"
        slot="end"
      >
        <helix-text>Console</helix-text>
      </helix-card>
    </helix-splitter>
  )
}
