export function Example() {
  return (
    <helix-splitter
      default-position="25"
      style={{ blockSize: '14rem' }}
    >
      <helix-card
        separation="plain"
        slot="start"
      >
        <helix-text>Files</helix-text>
      </helix-card>
      <helix-splitter
        default-position="50"
        slot="end"
        style={{ blockSize: '14rem' }}
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
    </helix-splitter>
  )
}
