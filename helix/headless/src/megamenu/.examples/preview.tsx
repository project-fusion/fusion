import './preview.css'

export function Example() {
  return (
    <helix-headless-navigation label="Main">
      <a href="#overview">Overview</a>
      <helix-headless-megamenu label="Products">
        <div data-megamenu-group>
          <h3 data-megamenu-heading>Work</h3>
          <a
            data-megamenu-item
            href="#helix"
          >
            <helix-headless-icon name="cube"></helix-headless-icon>
            <strong>Projects</strong>
            <span>Plan and track work across teams.</span>
          </a>
          <a
            data-megamenu-item
            href="#icons"
          >
            <helix-headless-icon name="palette"></helix-headless-icon>
            <strong>Documents</strong>
            <span>Write, edit, and share files.</span>
          </a>
        </div>
        <div data-megamenu-group>
          <h3 data-megamenu-heading>Insights</h3>
          <a
            data-megamenu-item
            href="#cortex"
          >
            <helix-headless-icon name="pulse"></helix-headless-icon>
            <strong>Reports</strong>
            <span>See how your projects are doing.</span>
          </a>
          <a
            data-megamenu-item
            href="#trace"
          >
            <helix-headless-icon name="strategy"></helix-headless-icon>
            <strong>Dashboards</strong>
            <span>Track the numbers you care about.</span>
          </a>
        </div>
      </helix-headless-megamenu>
      <a href="#pricing">Pricing</a>
    </helix-headless-navigation>
  )
}
