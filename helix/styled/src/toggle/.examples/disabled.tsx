export function Example() {
  return (
    <helix-toggle-group
      disabled
      label="View"
    >
      <helix-toggle
        selected
        value="list"
      >
        List
      </helix-toggle>
      <helix-toggle value="grid">Grid</helix-toggle>
    </helix-toggle-group>
  )
}
