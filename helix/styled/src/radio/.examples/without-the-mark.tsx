export function Example() {
  return (
    <helix-radio-group
      default-value="monthly"
      label="Billing"
      orientation="horizontal"
    >
      <helix-radio
        hide-control
        value="monthly"
        variant="chip"
      >
        Monthly
      </helix-radio>
      <helix-radio
        hide-control
        value="yearly"
        variant="chip"
      >
        Yearly
      </helix-radio>
    </helix-radio-group>
  )
}
