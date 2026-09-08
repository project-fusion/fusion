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

      {/* **Open, so the picture is of a dialog.** Baselines are taken of the
          preview and of nothing else, one per family, and this one photographed
          a closed dialog: a button on white. Nothing in the library had ever
          pictured a footer, which is how a row of buttons that overflows its own
          dialog shipped in `centered` without a single check going red. */}
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
            Delete
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
