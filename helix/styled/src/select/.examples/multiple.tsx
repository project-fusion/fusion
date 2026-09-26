export function Example() {
  return (
    <helix-select
      default-value="one,three"
      hint="Choose what the role can do"
      label="Permissions"
      multiple
      name="choice"
    >
      <helix-icon
        name="caret-down"
        slot="indicator"
      ></helix-icon>
      <helix-option-group label="Projects">
        <helix-option value="one">View projects</helix-option>
        <helix-option value="two">Edit projects</helix-option>
      </helix-option-group>
      <helix-option-group label="Billing">
        <helix-option value="three">View invoices</helix-option>
        <helix-option value="four">Manage payment methods</helix-option>
      </helix-option-group>
    </helix-select>
  )
}
