import './preview.css'

export function Example() {
  return (
    <helix-headless-accordion>
      <helix-headless-accordion-item default-open>
        <span slot="summary">Shipping</span>
        Orders ship within two business days. You receive a tracking number by email.
      </helix-headless-accordion-item>
      <helix-headless-accordion-item>
        <span slot="summary">Returns</span>
        You can return an item within 30 days.
      </helix-headless-accordion-item>
    </helix-headless-accordion>
  )
}
