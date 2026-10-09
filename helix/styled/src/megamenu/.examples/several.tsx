export function Example() {
  return (
    <helix-navigation label="Main">
      <a href="#overview">Overview</a>
      <helix-megamenu label="Products">
        <div data-megamenu-group>
          <helix-text
            as="h3"
            data-megamenu-heading
            variant="title"
          >
            Build
          </helix-text>
          <a
            data-megamenu-item
            href="#helix"
          >
            <helix-icon name="cube"></helix-icon>
            <strong>Projects</strong>
            <span>Plan and track work across teams.</span>
          </a>
        </div>
        <div data-megamenu-group>
          <helix-text
            as="h3"
            data-megamenu-heading
            variant="title"
          >
            Run
          </helix-text>
          <a
            data-megamenu-item
            href="#trace"
          >
            <helix-icon name="pulse"></helix-icon>
            <strong>Reports</strong>
            <span>See how your projects are doing.</span>
          </a>
        </div>
      </helix-megamenu>
      <helix-megamenu label="Solutions">
        <div data-megamenu-group>
          <helix-text
            as="h3"
            data-megamenu-heading
            variant="title"
          >
            By team
          </helix-text>
          <a
            data-megamenu-item
            href="#engineering"
          >
            <helix-icon name="gear"></helix-icon>
            <strong>Engineering</strong>
            <span>Plan releases and track bugs.</span>
          </a>
          <a
            data-megamenu-item
            href="#design"
          >
            <helix-icon name="palette"></helix-icon>
            <strong>Design</strong>
            <span>Share files and collect feedback.</span>
          </a>
        </div>
      </helix-megamenu>
      <helix-megamenu label="Company">
        <div data-megamenu-group>
          <helix-text
            as="h3"
            data-megamenu-heading
            variant="title"
          >
            About
          </helix-text>
          <a
            data-megamenu-item
            href="#story"
          >
            <helix-icon name="building"></helix-icon>
            <strong>About us</strong>
            <span>Our team and our history.</span>
          </a>
        </div>
      </helix-megamenu>
      <a href="#pricing">Pricing</a>
    </helix-navigation>
  )
}
