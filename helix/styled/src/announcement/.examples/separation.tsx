export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-announcement>Scheduled maintenance begins at 10 PM.</helix-announcement>
      <helix-announcement separation="filled">
        New team members can now be invited by email.
      </helix-announcement>
      <helix-announcement
        separation="filled"
        tone="info"
      >
        Your workspace was moved to a new server.
      </helix-announcement>
      <helix-announcement separation="outlined">
        Billing moves to the first of the month in June.
      </helix-announcement>
    </helix-flex>
  )
}
