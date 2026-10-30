export function Example() {
  return (
    <helix-splitter
      default-position="30"
      style={{ blockSize: '16rem' }}
    >
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
        style={{ blockSize: '16rem' }}
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
          <helix-text>Terminal</helix-text>
        </helix-card>
      </helix-splitter>
    </helix-splitter>
  )
}
