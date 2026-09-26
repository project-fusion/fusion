export function Example() {
  return (
    <helix-popover
      id="plain-details"
      label="Details"
      separation="plain"
    >
      <helix-button slot="trigger">Details</helix-button>
      <helix-text variant="body">
        Your file was uploaded and is ready to share with your team.
      </helix-text>
    </helix-popover>
  )
}
