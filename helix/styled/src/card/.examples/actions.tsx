export function Example() {
  return (
    <helix-card aria-labelledby="actions-title">
      <h3
        id="actions-title"
        slot="header"
      >
        Weekly report
      </h3>
      <helix-button
        emphasis="ghost"
        slot="header-actions"
      >
        Share
      </helix-button>
      Sent to your team every Monday at 9:00, with the numbers from the week before.
      <helix-button
        emphasis="ghost"
        slot="footer"
      >
        Preview
      </helix-button>
      <helix-button slot="footer-actions">Edit schedule</helix-button>
    </helix-card>
  )
}
