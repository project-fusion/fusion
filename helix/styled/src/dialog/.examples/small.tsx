export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="small-dialog"
        emphasis="solid"
        tone="primary"
      >
        Open dialog
      </helix-button>

      <helix-dialog
        id="small-dialog"
        label="Archive project?"
        size="sm"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Archive project?
        </helix-text>
        <helix-text>The project becomes read-only for everyone on the team.</helix-text>
        <helix-button-group
          label="Dialog actions"
          slot="footer"
          variant="spaced"
        >
          <helix-button
            command="--close"
            commandfor="small-dialog"
            emphasis="solid"
            tone="primary"
          >
            Archive project
          </helix-button>
          <helix-button
            command="--close"
            commandfor="small-dialog"
          >
            Cancel
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
