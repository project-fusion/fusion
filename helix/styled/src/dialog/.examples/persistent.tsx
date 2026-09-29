export function Example() {
  return (
    <helix-dialog
      default-open
      id="unsaved"
      label="Unsaved changes"
      persistent
    >
      <p>You have two unsaved changes. Save or discard them to continue.</p>
      <helix-button-group
        label="Dialog actions"
        slot="footer"
        variant="spaced"
      >
        <helix-button
          command="--close"
          commandfor="unsaved"
        >
          Discard changes
        </helix-button>
        <helix-button
          command="--close"
          commandfor="unsaved"
          emphasis="solid"
          tone="primary"
        >
          Save changes
        </helix-button>
      </helix-button-group>
    </helix-dialog>
  )
}
