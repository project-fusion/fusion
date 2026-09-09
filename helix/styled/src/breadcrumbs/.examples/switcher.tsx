export function Example() {
  return (
    <helix-breadcrumbs aria-label="Breadcrumb">
      <helix-breadcrumb href="#acme">acme</helix-breadcrumb>

      {/* Two targets, not one. The label is an ordinary crumb and navigates like
          every other crumb in the trail; the trigger sits in `end`, outside the
          anchor, and opens the list of what this step could be instead. A single
          control that did both would navigate whichever half the reader aimed
          at. */}
      <helix-breadcrumb href="#design-system">
        design-system
        <helix-menu
          label="Switch project"
          slot="end"
        >
          <helix-icon-button
            emphasis="ghost"
            label="Switch project"
            slot="trigger"
          >
            <helix-icon name="caret-down"></helix-icon>
          </helix-icon-button>
          <helix-menu-item href="#design-system">design-system</helix-menu-item>
          <helix-menu-item href="#marketing-site">marketing-site</helix-menu-item>
          <helix-menu-item href="#docs">docs</helix-menu-item>
        </helix-menu>
      </helix-breadcrumb>

      <helix-breadcrumb current>Components</helix-breadcrumb>
    </helix-breadcrumbs>
  )
}
