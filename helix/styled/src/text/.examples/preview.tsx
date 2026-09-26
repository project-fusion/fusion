export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-text
        as="h1"
        variant="display"
      >
        Account settings
      </helix-text>
      <helix-text
        as="p"
        emphasis="muted"
        variant="subheading"
      >
        Profile and preferences
      </helix-text>
      <helix-text
        as="p"
        variant="body"
      >
        Update your name, email address, and time zone. Your name and photo are shown to everyone in
        your workspace.
      </helix-text>
    </helix-flex>
  )
}
