export function Example() {
  return (
    <helix-steps
      default-active="two"
      label="Checkout"
      linear
    >
      <helix-step
        complete
        value="one"
      >
        Cart
      </helix-step>
      <helix-step value="two">Shipping</helix-step>
      <helix-step
        optional
        value="three"
      >
        Gift note
      </helix-step>
      <helix-step value="four">Payment</helix-step>
    </helix-steps>
  )
}
