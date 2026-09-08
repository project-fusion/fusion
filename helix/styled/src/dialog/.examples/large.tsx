export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="large-dialog"
        emphasis="solid"
        tone="primary"
      >
        Open dialog
      </helix-button>

      <helix-dialog
        id="large-dialog"
        label="Dialog Title"
        size="lg"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Dialog Title
        </helix-text>
        <helix-text>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          slot="footer"
          variant="spaced"
        >
          <helix-button
            command="--close"
            commandfor="large-dialog"
            emphasis="solid"
            tone="primary"
          >
            Save
          </helix-button>
          <helix-button
            command="--close"
            commandfor="large-dialog"
          >
            Cancel
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
