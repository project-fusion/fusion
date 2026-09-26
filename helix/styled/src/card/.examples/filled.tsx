export function Example() {
  return (
    <helix-card
      aria-labelledby="filled-title"
      separation="filled"
    >
      <h3
        id="filled-title"
        slot="header"
      >
        Storage
      </h3>
      You have used 8 GB of your 10 GB of storage.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Manage storage
      </helix-button>
    </helix-card>
  )
}
