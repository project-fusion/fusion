export function Example() {
  return (
    <helix-tabs
      default-active="overview"
      manual
    >
      <helix-tab value="overview">Overview</helix-tab>
      <helix-tab value="usage">Usage</helix-tab>
      <helix-tab value="billing">Billing</helix-tab>

      <helix-tab-panel
        slot="panels"
        value="overview"
      >
        A summary of your account activity this month.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="usage"
      >
        Requests, storage, and bandwidth.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="billing"
      >
        Invoices and the payment method on file.
      </helix-tab-panel>
    </helix-tabs>
  )
}
