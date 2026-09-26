import './as-many-as-fit.css'

export function Example() {
  return (
    <helix-carousel
      label="Folders"
      per-view="auto"
    >
      <helix-card separation="outlined">Reports</helix-card>
      <helix-card separation="outlined">Invoices</helix-card>
      <helix-card separation="outlined">Contracts</helix-card>
      <helix-card separation="outlined">Receipts</helix-card>
      <helix-card separation="outlined">Proposals</helix-card>
      <helix-card separation="outlined">Templates</helix-card>
    </helix-carousel>
  )
}
