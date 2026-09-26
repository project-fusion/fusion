export function Example() {
  return (
    <helix-card
      aria-labelledby="card-title"
      separation="outlined"
    >
      <h3
        id="card-title"
        slot="header"
      >
        Storage
      </h3>
      You have used 8 GB of the 10 GB in your plan. Delete old files or upgrade to add space.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Manage storage
      </helix-button>
    </helix-card>
  )
}
