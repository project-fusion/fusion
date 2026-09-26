export function Example() {
  return (
    <helix-toggle-group
      default-value="one"
      hint="Applies to every list"
      label="Sort order"
      separation="plain"
    >
      <helix-toggle value="one">Newest</helix-toggle>
      <helix-toggle value="two">Oldest</helix-toggle>
    </helix-toggle-group>
  )
}
