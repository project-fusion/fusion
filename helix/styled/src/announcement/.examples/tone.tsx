export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* `accent` matches `primary` until the theme sets a second color. */}
      <helix-announcement tone="neutral">
        Scheduled maintenance on Sunday, from 02:00 to 04:00 UTC.
      </helix-announcement>
      <helix-announcement tone="accent">
        Read the release notes for this week's changes.
      </helix-announcement>
      <helix-announcement tone="primary">
        Single sign-on is available on every plan from today.
      </helix-announcement>
      <helix-announcement tone="info">
        A new data region is available in eu-west-2.
      </helix-announcement>
      <helix-announcement tone="success">
        Your plan is active. Everything is available again.
      </helix-announcement>
      <helix-announcement tone="warning">Your trial ends in three days.</helix-announcement>
      <helix-announcement tone="danger">
        Payment failed. Update your card to keep the workspace open.
      </helix-announcement>
    </helix-flex>
  )
}
