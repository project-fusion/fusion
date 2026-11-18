export function Example() {
  return (
    <helix-toast
      label="Notifications"
      placement="bottom-end"
    >
      <helix-toast-item>Export started.</helix-toast-item>
      <helix-toast-item tone="info">Two devices are now signed in.</helix-toast-item>
      <helix-toast-item tone="success">Project saved.</helix-toast-item>
      <helix-toast-item tone="warning">Two files were skipped.</helix-toast-item>
      <helix-toast-item tone="danger">Could not reach the server.</helix-toast-item>
    </helix-toast>
  )
}
