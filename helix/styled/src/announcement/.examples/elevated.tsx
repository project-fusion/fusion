export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* The rung and the tone are set independently, which is the whole reason
          this is not a tone: an elevated band still takes its tone's tint, mixed
          against the rung it is riding rather than against the page. */}
      <helix-announcement separation="filled">
        In a well, which is where a band rests.
      </helix-announcement>
      <helix-announcement separation="elevated">
        On the surface step, level with the furniture around it.
      </helix-announcement>
      <helix-announcement
        separation="elevated"
        tone="info"
      >
        Elevated and toned at once, which a single property could not ask for.
      </helix-announcement>
    </helix-flex>
  )
}
