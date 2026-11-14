export function Example() {
  return (
    <helix-flex
      gap="md"
      layout="switch"
      style={{ '--flex-switch-at': '36rem' }}
    >
      <helix-card separation="outlined">
        <helix-text
          as="h3"
          scale="title"
          slot="header"
        >
          Plan
        </helix-text>
        Ten projects and 10 GB of storage.
      </helix-card>
      <helix-card separation="outlined">
        <helix-text
          as="h3"
          scale="title"
          slot="header"
        >
          Team
        </helix-text>
        Five seats, each with its own sign-in.
      </helix-card>
      <helix-card separation="outlined">
        <helix-text
          as="h3"
          scale="title"
          slot="header"
        >
          Support
        </helix-text>
        Answers within one working day.
      </helix-card>
    </helix-flex>
  )
}
