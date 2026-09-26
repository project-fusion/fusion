import './preview.css'

export function Example() {
  return (
    <>
      <helix-headless-button
        command="--show"
        commandfor="panel"
      >
        Open drawer
      </helix-headless-button>

      <helix-headless-drawer
        id="panel"
        label="Project details"
        placement="end"
      >
        <span slot="header">Project details</span>
        <div className="stack">
          <p>See who owns the project, who can edit it, and when it last changed.</p>
          <helix-headless-button
            command="--close"
            commandfor="panel"
          >
            Close
          </helix-headless-button>
        </div>
      </helix-headless-drawer>
    </>
  )
}
