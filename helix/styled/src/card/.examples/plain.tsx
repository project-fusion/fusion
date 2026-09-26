export function Example() {
  return (
    <helix-card
      aria-labelledby="plain-title"
      separation="plain"
    >
      <h3
        id="plain-title"
        slot="header"
      >
        Profile
      </h3>
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
