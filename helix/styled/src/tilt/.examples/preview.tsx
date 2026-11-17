export function Example() {
  return (
    <helix-tilt>
      <helix-card
        aria-labelledby="tilt-title"
        separation="elevated"
      >
        <helix-text
          as="h3"
          id="tilt-title"
          scale="title"
          slot="header"
        >
          Team plan
        </helix-text>
        Invite up to 10 people and share projects with your team.
      </helix-card>
    </helix-tilt>
  )
}
