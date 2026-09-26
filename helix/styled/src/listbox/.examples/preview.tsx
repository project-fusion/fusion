export function Example() {
  return (
    <helix-listbox
      default-value="two"
      hint="Billed monthly"
      label="Plan"
      name="choice"
    >
      <helix-option value="one">Free</helix-option>
      <helix-option value="two">Pro</helix-option>
      <helix-option value="three">Team</helix-option>
      <helix-option
        disabled
        value="four"
      >
        Enterprise
      </helix-option>
    </helix-listbox>
  )
}
