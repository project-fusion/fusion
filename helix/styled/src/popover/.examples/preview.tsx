import './preview.css'

export function Example() {
  return (
    <helix-popover
      className="details"
      id="details"
      label="Details"
    >
      <helix-button slot="trigger">Details</helix-button>
      <helix-flex
        direction="column"
        gap="md"
      >
        <helix-text variant="body">
          Anything can go in here. The panel is in the top layer, so it clears a scrolling parent
          without a z-index.
        </helix-text>
        <helix-flex justify-content="end">
          <helix-button
            command="--close"
            commandfor="details"
            emphasis="outlined"
          >
            Close
          </helix-button>
        </helix-flex>
      </helix-flex>
    </helix-popover>
  )
}
