import './preview.css'

export function Example() {
  return (
    <helix-headless-checkbox-group
      hint="Hint"
      label="Label"
      name="group"
      value="one,two"
    >
      <helix-headless-checkbox value="one">Option One</helix-headless-checkbox>
      <helix-headless-checkbox value="two">Option Two</helix-headless-checkbox>
      <helix-headless-checkbox value="three">Option Three</helix-headless-checkbox>
      <helix-headless-checkbox value="four">Option Four</helix-headless-checkbox>
    </helix-headless-checkbox-group>
  )
}
