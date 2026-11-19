export function Example() {
  return (
    <helix-border-beam>
      <helix-card
        aria-labelledby="beam-title"
        separation="outlined"
      >
        <helix-text
          as="h3"
          id="beam-title"
          scale="title"
          slot="header"
        >
          Writing a reply
        </helix-text>
        The agent is reading your files and drafting the changes you asked for.
      </helix-card>
    </helix-border-beam>
  )
}
