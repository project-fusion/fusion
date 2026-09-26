export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="full-dialog"
        emphasis="solid"
        tone="primary"
      >
        Open dialog
      </helix-button>

      <helix-dialog
        id="full-dialog"
        label="Edit project"
        size="full"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Edit project
        </helix-text>
        <helix-text>
          Update the project name, description, and members. Your changes apply to everyone on the
          team.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          slot="footer"
          variant="spaced"
        >
          <helix-button
            command="--close"
            commandfor="full-dialog"
            emphasis="solid"
            tone="primary"
          >
            Save changes
          </helix-button>
          <helix-button
            command="--close"
            commandfor="full-dialog"
          >
            Cancel
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
