export function Example() {
  return (
    <helix-steps
      default-active="two"
      label="Checkout"
    >
      <helix-step
        complete
        value="one"
      >
        Cart
      </helix-step>
      <helix-step value="two">Shipping</helix-step>
      <helix-step value="three">Payment</helix-step>
    </helix-steps>
  )
}
