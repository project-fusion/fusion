import './collapsed.css'

export function Example() {
  return (
    <helix-splitter
      collapsed-size="8"
      default-collapsed="end"
      default-position="60"
    >
      <helix-card
        separation="plain"
        slot="start"
      >
        <helix-text>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</helix-text>
      </helix-card>
      <helix-card
        separation="plain"
        slot="end"
      >
        <helix-text>Terminal</helix-text>
      </helix-card>
    </helix-splitter>
  )
}
