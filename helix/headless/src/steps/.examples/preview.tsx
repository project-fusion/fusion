import './preview.css'

export function Example() {
  return (
    <helix-headless-steps label="Checkout">
      <helix-headless-step complete>Details</helix-headless-step>
      <helix-headless-step current>Payment</helix-headless-step>
      <helix-headless-step>Review</helix-headless-step>
    </helix-headless-steps>
  )
}
