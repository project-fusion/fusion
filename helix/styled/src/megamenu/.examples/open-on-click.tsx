export function Example() {
  return (
    <helix-navigation label="Main">
      <a href="#overview">Overview</a>
      <helix-megamenu
        label="Products"
        open-on="click"
      >
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
    </helix-navigation>
  )
}
