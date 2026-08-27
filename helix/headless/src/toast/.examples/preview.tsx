import './preview.css'

export function Example() {
  return (
    <helix-headless-toast label="Notifications" placement="bottom-end">
      <helix-headless-toast-item dismissible tone="success">
        Project saved.
      </helix-headless-toast-item>
      <helix-headless-toast-item dismissible tone="danger">
        Could not reach the server.
        <helix-headless-button slot="actions">Retry</helix-headless-button>
      </helix-headless-toast-item>
    </helix-headless-toast>
  )
}
