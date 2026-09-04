export function Example() {
  return (
    <helix-toggle-group
      default-value="one"
      hint="Hint"
      label="Label"
      separation="plain"
    >
      <helix-toggle value="one">Option One</helix-toggle>
      <helix-toggle value="two">Option Two</helix-toggle>
    </helix-toggle-group>
  )
}
