export function Example() {
  return (
    <helix-steps
      label="Checkout"
      variant="numeric"
    >
      <helix-step
        complete
        value="one"
      >
        Cart
      </helix-step>
      <helix-step
        current
        value="two"
      >
        Shipping
      </helix-step>
      <helix-step value="three">Payment</helix-step>
    </helix-steps>
  )
}
