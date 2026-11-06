export function Example() {
  return (
    <helix-splitter
      default-position="40"
      handle="grip"
      style={{ blockSize: '12rem' }}
    >
      <helix-card
        separation="plain"
        slot="start"
      >
        <helix-text>Navigator</helix-text>
      </helix-card>
      <helix-card
        separation="plain"
        slot="end"
      >
        <helix-text>Editor</helix-text>
      </helix-card>
    </helix-splitter>
  )
}
