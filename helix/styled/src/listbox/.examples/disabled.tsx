export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-listbox
        default-value="two"
        disabled
        hint="Managed by your admin"
        label="Plan"
        name="a"
      >
        <helix-option value="one">Free</helix-option>
        <helix-option value="two">Pro</helix-option>
      </helix-listbox>

      {/* The fieldset around this list disables it. */}
      <fieldset disabled>
        <helix-listbox
          default-value="one"
          hint="Managed by your admin"
          label="Billing cycle"
          name="b"
        >
          <helix-option value="one">Monthly</helix-option>
          <helix-option value="two">Yearly</helix-option>
        </helix-listbox>
      </fieldset>
    </helix-flex>
  )
}
