export function Example() {
  return (
    <helix-navigation label="Main">
      <helix-navigation-item href="#overview">Overview</helix-navigation-item>
      <helix-megamenu
        label="Products"
        open-on="click"
      >
        <helix-megamenu-group label="Build">
          <helix-megamenu-item href="#helix">
            <helix-icon
              name="cube"
              slot="icon"
            ></helix-icon>
            Projects
            <helix-text slot="description">Plan and track work across teams.</helix-text>
          </helix-megamenu-item>
        </helix-megamenu-group>
        <helix-megamenu-group label="Run">
          <helix-megamenu-item href="#trace">
            <helix-icon
              name="pulse"
              slot="icon"
            ></helix-icon>
            Reports
            <helix-text slot="description">See how your projects are doing.</helix-text>
          </helix-megamenu-item>
        </helix-megamenu-group>
      </helix-megamenu>
    </helix-navigation>
  )
}
