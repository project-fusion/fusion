import './preview.css'

export function Example() {
  return (
    <helix-headless-select default-value="two" hint="Hint" label="Label" name="choice">
      <helix-headless-icon name="caret-down" slot="indicator"></helix-headless-icon>
      <helix-headless-option value="one">Option One</helix-headless-option>
      <helix-headless-option value="two">Option Two</helix-headless-option>
      <helix-headless-option value="three">Option Three</helix-headless-option>
    </helix-headless-select>
  )
}
