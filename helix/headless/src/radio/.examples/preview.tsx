import './preview.css'

export function Example() {
  return (
    <helix-headless-radio-group
      default-value="one"
      hint="Billed monthly"
      label="Plan"
      name="group"
    >
      <helix-headless-radio value="one">Free</helix-headless-radio>
      <helix-headless-radio value="two">Pro</helix-headless-radio>
      <helix-headless-radio value="three">Team</helix-headless-radio>
    </helix-headless-radio-group>
  )
}
