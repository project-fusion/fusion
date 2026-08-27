import './preview.css'

export function Example() {
  return (
    <helix-headless-listbox default-value="two" hint="Hint" label="Label" name="choice">
      <helix-headless-option value="one">Option One</helix-headless-option>
      <helix-headless-option value="two">Option Two</helix-headless-option>
      <helix-headless-option value="three">Option Three</helix-headless-option>
      <helix-headless-option disabled value="four">
        Option Four
      </helix-headless-option>
    </helix-headless-listbox>
  )
}
