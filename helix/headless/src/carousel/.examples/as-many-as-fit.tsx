import './as-many-as-fit.css'

export function Example() {
  return (
    <helix-headless-carousel
      label="Folders"
      per-view="auto"
    >
      <helix-headless-card>Reports</helix-headless-card>
      <helix-headless-card>Invoices</helix-headless-card>
      <helix-headless-card>Contracts</helix-headless-card>
      <helix-headless-card>Receipts</helix-headless-card>
      <helix-headless-card>Proposals</helix-headless-card>
      <helix-headless-card>Templates</helix-headless-card>
    </helix-headless-carousel>
  )
}
