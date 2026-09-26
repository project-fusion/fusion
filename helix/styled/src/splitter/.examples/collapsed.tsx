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
        <helix-text>Project overview and recent activity for your team.</helix-text>
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
