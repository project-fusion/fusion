export function Example() {
  return (
    <helix-card
      aria-labelledby="filled-title"
      separation="filled"
    >
      <helix-text
        as="h3"
        id="filled-title"
        slot="header"
        variant="title"
      >
        Storage
      </helix-text>
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
