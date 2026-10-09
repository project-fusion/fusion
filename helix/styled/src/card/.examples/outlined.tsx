export function Example() {
  return (
    <helix-card
      aria-labelledby="outlined-title"
      separation="outlined"
    >
      <helix-text
        as="h3"
        id="outlined-title"
        slot="header"
        variant="title"
      >
        Notifications
      </helix-text>
      Choose which emails you receive about activity in your projects.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Edit settings
      </helix-button>
    </helix-card>
  )
}
