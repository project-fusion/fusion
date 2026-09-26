export function Example() {
  return (
    <helix-radio-group
      default-value="one"
      hint="Billed monthly"
      label="Plan"
      name="group"
    >
      <helix-radio value="one">Free</helix-radio>
      <helix-radio value="two">Pro</helix-radio>
      <helix-radio value="three">Team</helix-radio>
    </helix-radio-group>
  )
}
