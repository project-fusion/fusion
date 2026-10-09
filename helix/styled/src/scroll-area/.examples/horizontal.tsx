import './horizontal.css'

export function Example() {
  return (
    <helix-scroll-area label="Sections">
      <div className="cards">
        <helix-card separation="outlined">
          <helix-text
            as="h3"
            slot="header"
          >
            Overview
          </helix-text>
          Everything at a glance, updated live.
        </helix-card>
        <helix-card separation="outlined">
          <helix-text
            as="h3"
            slot="header"
          >
            Reports
          </helix-text>
          Build, schedule, and share reports.
        </helix-card>
        <helix-card separation="outlined">
          <helix-text
            as="h3"
            slot="header"
          >
            Billing
          </helix-text>
          Invoices, proration, and receipts.
        </helix-card>
        <helix-card separation="outlined">
          <helix-text
            as="h3"
            slot="header"
          >
            Members
          </helix-text>
          Manage who has access.
        </helix-card>
        <helix-card separation="outlined">
          <helix-text
            as="h3"
            slot="header"
          >
            Settings
          </helix-text>
          Defaults for the whole workspace.
        </helix-card>
      </div>
    </helix-scroll-area>
  )
}
