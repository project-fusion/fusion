export function Example() {
  return (
    <helix-flex direction="column" gap="sm">
      <helix-announcement tone="neutral">
        Scheduled maintenance on Sunday, from 02:00 to 04:00 UTC.
      </helix-announcement>
      <helix-announcement tone="surface">
        Fusion Design ships a new component every week.
      </helix-announcement>
      <helix-announcement tone="primary">
        Fusion Mind is available on every plan from today.
      </helix-announcement>
      <helix-announcement tone="info">A new region is open in eu-west-2.</helix-announcement>
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
