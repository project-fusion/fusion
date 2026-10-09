export function Example() {
  return (
    <helix-app-header>
      <span slot="start">Fusion</span>
      <helix-navigation label="Main">
        <helix-megamenu
          label="Products"
          variant="band"
        >
          <div data-megamenu-group>
            <helix-text
              as="h3"
              data-megamenu-heading
            >
              Work
            </helix-text>
            <a
              data-megamenu-item
              href="#helix"
            >
              <helix-icon name="cube"></helix-icon>
              <strong>Projects</strong>
              <span>Plan and track work across teams.</span>
            </a>
            <a
              data-megamenu-item
              href="#icons"
            >
              <helix-icon name="palette"></helix-icon>
              <strong>Documents</strong>
              <span>Write, edit, and share files.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <helix-text
              as="h3"
              data-megamenu-heading
            >
              Insights
            </helix-text>
            <a
              data-megamenu-item
              href="#cortex"
            >
              <helix-icon name="pulse"></helix-icon>
              <strong>Reports</strong>
              <span>See how your projects are doing.</span>
            </a>
            <a
              data-megamenu-item
              href="#trace"
            >
              <helix-icon name="strategy"></helix-icon>
              <strong>Dashboards</strong>
              <span>Track the numbers you care about.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <helix-text
              as="h3"
              data-megamenu-heading
            >
              Connect
            </helix-text>
            <a
              data-megamenu-item
              href="#grid"
            >
              <helix-icon name="lightbulb"></helix-icon>
              <strong>Integrations</strong>
              <span>Connect the tools your team uses.</span>
            </a>
            <a
              data-megamenu-item
              href="#chart"
            >
              <helix-icon name="chart-line"></helix-icon>
              <strong>API</strong>
              <span>Build on your account data.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <helix-text
              as="h3"
              data-megamenu-heading
            >
              More
            </helix-text>
            <a
              data-navigation-item
              href="#docs"
            >
              Documentation
            </a>
            <a
              data-navigation-item
              href="#changelog"
            >
              Changelog
            </a>
            <a
              data-navigation-item
              href="#status"
            >
              Status
            </a>
          </div>
        </helix-megamenu>
        <a href="#pricing">Pricing</a>
      </helix-navigation>
    </helix-app-header>
  )
}
