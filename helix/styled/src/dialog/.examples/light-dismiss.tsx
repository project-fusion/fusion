export function Example() {
  return (
    <helix-dialog
      closedby="any"
      default-open
      label="Shelf shared"
      size="sm"
    >
      <helix-text
        as="h2"
        slot="header"
      >
        Shelf shared
      </helix-text>
      <helix-text>
        Anyone with the link can read Weeknight cooking. Anything you add to it later goes with it.
      </helix-text>
    </helix-dialog>
  )
}
