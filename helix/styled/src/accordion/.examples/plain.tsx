export function Example() {
  return (
    <helix-accordion separation="plain">
      <helix-accordion-item default-open>
        <span slot="summary">Shipping</span>
        Orders ship within two business days. You receive a tracking number by email.
      </helix-accordion-item>
      <helix-accordion-item>
        <span slot="summary">Returns</span>
        You can return an item within 30 days.
      </helix-accordion-item>
    </helix-accordion>
  )
}
