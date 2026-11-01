import './switch.css'

export function Example() {
  return (
    <helix-flex
      className="plans"
      gap="md"
      layout="switch"
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
