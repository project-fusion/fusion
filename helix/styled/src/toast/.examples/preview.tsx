export function Example() {
  return (
    <helix-toast label="Notifications" placement="bottom-end">
      <helix-toast-item dismissible tone="success">
        Project saved.
      </helix-toast-item>
      <helix-toast-item dismissible tone="danger">
        Could not reach the server.
        <helix-button slot="actions">Retry</helix-button>
      </helix-toast-item>
    </helix-toast>
  )
}
