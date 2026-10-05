export function Example() {
  return (
    <helix-dialog
      alert
      default-open
      dismissible
      id="delete-project"
    >
      <h2 slot="header">Delete project</h2>
      <p>The project and its history are deleted for everyone on your team.</p>
      <helix-button-group
        label="Dialog actions"
        slot="footer"
        variant="spaced"
      >
        <helix-button
          command="--close"
          commandfor="delete-project"
        >
          Keep project
        </helix-button>
        <helix-button
          command="--close"
          commandfor="delete-project"
          emphasis="solid"
          tone="danger"
        >
          Delete project
        </helix-button>
      </helix-button-group>
    </helix-dialog>
  )
}
