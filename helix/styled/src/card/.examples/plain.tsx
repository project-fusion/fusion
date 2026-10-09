export function Example() {
  return (
    <helix-card
      aria-labelledby="plain-title"
      separation="plain"
    >
      <helix-text
        as="h3"
        id="plain-title"
        slot="header"
        variant="title"
      >
        Profile
      </helix-text>
      Update your name, photo, and contact details.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Edit profile
      </helix-button>
    </helix-card>
  )
}
