export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="confirm"
        emphasis="solid"
        tone="primary"
      >
        Delete project
      </helix-button>

      {/* The dialog starts open, so the preview shows it. */}
      <helix-dialog
        id="confirm"
        label="Delete project"
        open
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Delete project
        </helix-text>
        <helix-text>This removes the project and everything in it. It cannot be undone.</helix-text>
        <helix-button-group
          label="Dialog actions"
          slot="footer"
          variant="spaced"
        >
          <helix-button
            command="--close"
            commandfor="confirm"
            emphasis="solid"
            tone="danger"
          >
            Delete project
          </helix-button>
          <helix-button
            command="--close"
            commandfor="confirm"
          >
            Cancel
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
