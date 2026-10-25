export function Example() {
  return (
    <helix-toggle-group
      label="Status"
      name="status"
      selection-mode="multiple"
      value="open"
    >
      <helix-toggle value="open">Open</helix-toggle>
      <helix-toggle value="review">In review</helix-toggle>
      <helix-toggle value="closed">Closed</helix-toggle>
    </helix-toggle-group>
  )
}
