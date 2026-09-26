import './preview.css'

export function Example() {
  return (
    <helix-headless-popover
      id="details"
      label="Project details"
    >
      <helix-headless-button slot="trigger">Project details</helix-headless-button>
      <div className="stack">
        <p>The project has 12 members and 48 files. It was last updated on September 15, 2026.</p>
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
