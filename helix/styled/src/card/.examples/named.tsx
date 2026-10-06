export function Example() {
  return (
    <helix-card
      label="Storage"
      separation="outlined"
    >
      <h3 slot="header">Storage</h3>
      You have used 8 GB of the 10 GB in your plan.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Manage storage
      </helix-button>
    </helix-card>
  )
}
