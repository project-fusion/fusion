export function Example() {
  return (
    <helix-toggle-group
      default-value="one"
      hint="How the results are laid out"
      label="View"
    >
      <helix-toggle value="one">List</helix-toggle>
      <helix-toggle value="two">Grid</helix-toggle>
      <helix-toggle value="three">Board</helix-toggle>
    </helix-toggle-group>
  )
}
