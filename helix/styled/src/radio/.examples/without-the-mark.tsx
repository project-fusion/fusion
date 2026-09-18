export function Example() {
  return (
    <helix-radio-group
      default-value="monthly"
      label="Billing"
      orientation="horizontal"
    >
      <helix-radio
        hide-control
        separation="outlined"
        value="monthly"
      >
        Monthly
      </helix-radio>
      <helix-radio
        hide-control
        separation="outlined"
        value="yearly"
      >
        Yearly
      </helix-radio>
    </helix-radio-group>
  )
}
