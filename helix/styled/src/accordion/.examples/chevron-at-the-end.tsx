export function Example() {
  return (
    <helix-accordion>
      <helix-accordion-item
        chevron-placement="end"
        default-open
      >
        <span slot="summary">Delivery</span>
        Two to four working days across the mainland.
      </helix-accordion-item>
      <helix-accordion-item chevron-placement="end">
        <span slot="summary">Returns</span>
        Thirty days, unopened, with the receipt.
      </helix-accordion-item>
    </helix-accordion>
  )
}
