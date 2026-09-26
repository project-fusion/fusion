export function Example() {
  return (
    <helix-dialog
      default-open
      label="Unsaved changes"
      persistent
    >
      <p>You have two unsaved changes. Save or discard them to continue.</p>
      <helix-button-group
        label="Dialog actions"
        slot="footer"
        variant="spaced"
      >
        <helix-button>Discard changes</helix-button>
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Save changes
        </helix-button>
      </helix-button-group>
    </helix-dialog>
  )
}
