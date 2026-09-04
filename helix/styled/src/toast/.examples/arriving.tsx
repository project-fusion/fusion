import './arriving.css'

export function Example() {
  return (
    <helix-toast
      className="stack"
      label="Notifications"
      placement="bottom-end"
    >
      <helix-toast-item
        dismissible
        tone="success"
      >
        Project saved.
      </helix-toast-item>
      <helix-toast-item
        dismissible
        tone="info"
      >
        Two devices are now signed in.
      </helix-toast-item>
      <helix-toast-item
        dismissible
        tone="warning"
      >
        Two files were skipped.
      </helix-toast-item>
      <helix-toast-item
        dismissible
        tone="danger"
      >
        Could not reach the server.
        <helix-button slot="actions">Retry</helix-button>
      </helix-toast-item>
    </helix-toast>
  )
}
