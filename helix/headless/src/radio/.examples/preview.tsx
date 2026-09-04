import './preview.css'

export function Example() {
  return (
    <helix-headless-radio-group
      default-value="one"
      hint="Hint"
      label="Label"
      name="group"
    >
      <helix-headless-radio value="one">Option One</helix-headless-radio>
      <helix-headless-radio value="two">Option Two</helix-headless-radio>
      <helix-headless-radio value="three">Option Three</helix-headless-radio>
    </helix-headless-radio-group>
  )
}
