export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-announcement separation="filled">
        Scheduled maintenance begins at 10 PM.
      </helix-announcement>
      <helix-announcement separation="elevated">
        New team members can now be invited by email.
      </helix-announcement>
      <helix-announcement
        separation="elevated"
        tone="info"
      >
        Your workspace was moved to a new server.
      </helix-announcement>
    </helix-flex>
  )
}
