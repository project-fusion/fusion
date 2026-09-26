import './preview.css'

export function Example() {
  return (
    <helix-headless-listbox
      default-value="two"
      hint="Billed monthly"
      label="Plan"
      name="choice"
    >
      <helix-headless-option value="one">Free</helix-headless-option>
      <helix-headless-option value="two">Pro</helix-headless-option>
      <helix-headless-option value="three">Team</helix-headless-option>
      <helix-headless-option
        disabled
        value="four"
      >
        Enterprise
      </helix-headless-option>
    </helix-headless-listbox>
  )
}
