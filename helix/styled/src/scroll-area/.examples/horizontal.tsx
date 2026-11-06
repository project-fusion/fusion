export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 22rem)' }}>
      <helix-scroll-area
        label="Sections"
        style={{ '--scroll-area-fade-block-end': '0' }}
      >
        <helix-grid
          gap="sm"
          style={{ '--grid-columns': 'repeat(5, 11rem)' }}
        >
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              slot="header"
              style={{ '--text-font-size': 'var(--helix-text-md)' }}
            >
              Overview
            </helix-text>
            Everything at a glance, updated live.
          </helix-card>
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              slot="header"
              style={{ '--text-font-size': 'var(--helix-text-md)' }}
            >
              Reports
            </helix-text>
            Build, schedule, and share reports.
          </helix-card>
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              slot="header"
              style={{ '--text-font-size': 'var(--helix-text-md)' }}
            >
              Billing
            </helix-text>
            Invoices, proration, and receipts.
          </helix-card>
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              slot="header"
              style={{ '--text-font-size': 'var(--helix-text-md)' }}
            >
              Members
            </helix-text>
            Manage who has access.
          </helix-card>
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              slot="header"
              style={{ '--text-font-size': 'var(--helix-text-md)' }}
            >
              Settings
            </helix-text>
            Defaults for the whole workspace.
          </helix-card>
        </helix-grid>
      </helix-scroll-area>
    </helix-grid>
  )
}
