export function Example() {
  return (
    <helix-tabs
      default-active="overview"
      manual
    >
      <helix-tab value="overview">Overview</helix-tab>
      <helix-tab value="usage">Usage</helix-tab>
      <helix-tab value="billing">Billing</helix-tab>

      <div slot="panels">
        <helix-tab-panel value="overview">What the account is doing this month.</helix-tab-panel>
        <helix-tab-panel value="usage">Requests, storage and egress.</helix-tab-panel>
        <helix-tab-panel value="billing">Invoices and the payment method on file.</helix-tab-panel>
      </div>
    </helix-tabs>
  )
}
