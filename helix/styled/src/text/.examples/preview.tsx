export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-text
        as="h1"
        scale="display"
      >
        Account settings
      </helix-text>
      <helix-text
        as="p"
        emphasis="muted"
        scale="subheading"
      >
        Profile and preferences
      </helix-text>
      <helix-text
        as="p"
        scale="body"
      >
        Update your name, email address, and time zone. Your name and photo are shown to everyone in
        your workspace.
      </helix-text>
    </helix-flex>
  )
}
