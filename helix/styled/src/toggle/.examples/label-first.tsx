export function Example() {
  return (
    <helix-toggle-group
      default-value="on"
      label="Notifications"
      label-placement="start"
    >
      <helix-toggle value="on">On</helix-toggle>
      <helix-toggle value="off">Off</helix-toggle>
    </helix-toggle-group>
  )
}
