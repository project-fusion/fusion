export function Example() {
  return (
    <helix-toast
      label="Notifications"
      max-visible="2"
      placement="bottom-end"
    >
      <helix-toast-item dismissible>Project saved.</helix-toast-item>
      <helix-toast-item dismissible>Two files were uploaded.</helix-toast-item>
      <helix-toast-item dismissible>A comment was added to Roadmap.</helix-toast-item>
      <helix-toast-item dismissible>Your export is ready.</helix-toast-item>
    </helix-toast>
  )
}
