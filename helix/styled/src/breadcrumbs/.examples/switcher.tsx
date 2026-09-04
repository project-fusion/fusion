export function Example() {
  return (
    <helix-breadcrumbs aria-label="Breadcrumb">
      <helix-breadcrumb href="/">acme</helix-breadcrumb>

      <helix-breadcrumb current>
        <helix-menu label="Switch project">
          <helix-button
            emphasis="ghost"
            slot="trigger"
          >
            design-system
            <helix-icon
              name="caret-down"
              slot="end"
            ></helix-icon>
          </helix-button>
          <helix-menu-item href="/design-system">design-system</helix-menu-item>
          <helix-menu-item href="/marketing-site">marketing-site</helix-menu-item>
          <helix-menu-item href="/docs">docs</helix-menu-item>
        </helix-menu>
      </helix-breadcrumb>
    </helix-breadcrumbs>
  )
}
