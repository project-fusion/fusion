export function Example() {
  return (
    <helix-card
      label="Storage"
      separation="outlined"
    >
      <helix-text
        as="h3"
        scale="title"
        slot="header"
      >
        Storage
      </helix-text>
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
