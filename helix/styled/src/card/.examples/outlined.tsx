export function Example() {
  return (
    <helix-card
      aria-labelledby="outlined-title"
      separation="outlined"
    >
      <h3
        id="outlined-title"
        slot="header"
      >
        Notifications
      </h3>
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
