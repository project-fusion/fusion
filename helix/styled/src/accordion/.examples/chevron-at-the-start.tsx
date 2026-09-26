export function Example() {
  return (
    <helix-accordion>
      <helix-accordion-item
        chevron-placement="start"
        default-open
      >
        <span slot="summary">Delivery</span>
        Orders arrive in two to four business days.
      </helix-accordion-item>
      <helix-accordion-item chevron-placement="start">
        <span slot="summary">Returns</span>
        Return unopened items within 30 days.
      </helix-accordion-item>
    </helix-accordion>
  )
}
