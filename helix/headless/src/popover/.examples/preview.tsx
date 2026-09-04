import './preview.css'

export function Example() {
  return (
    <helix-headless-popover
      id="details"
      label="Details"
    >
      <helix-headless-button slot="trigger">Details</helix-headless-button>
      <div className="stack">
        <p>
          Anything can go in here. The panel is in the top layer, so it clears a scrolling parent
          without a z-index.
        </p>
        <div className="actions">
          <helix-headless-button
            command="--close"
            commandfor="details"
          >
            Close
          </helix-headless-button>
        </div>
      </div>
    </helix-headless-popover>
  )
}
