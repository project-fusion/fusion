export function Example() {
  return (
    <helix-accordion mode="single">
      <helix-accordion-item default-open>
        <helix-text slot="summary">Shipping</helix-text>
        Orders ship within two business days. You receive a tracking number by email.
      </helix-accordion-item>
      <helix-accordion-item>
        <helix-text slot="summary">Returns</helix-text>
        You can return an item within 30 days.
      </helix-accordion-item>
    </helix-accordion>
  )
}
