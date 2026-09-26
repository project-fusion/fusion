import './horizontal.css'

export function Example() {
  return (
    <helix-scroll-area label="Sections">
      <div className="cards">
        <helix-card separation="outlined">
          <h3 slot="header">Overview</h3>
          Everything at a glance, updated live.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Reports</h3>
          Build, schedule, and share reports.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Billing</h3>
          Invoices, proration, and receipts.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Members</h3>
          Manage who has access.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Settings</h3>
          Defaults for the whole workspace.
        </helix-card>
      </div>
    </helix-scroll-area>
  )
}
