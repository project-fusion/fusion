import './preview.css'

export function Example() {
  return (
    <helix-drilldown
      className="panel"
      label="Settings"
    >
      <helix-drilldown-item value="appearance">
        Appearance
        <helix-drilldown-item
          slot="page"
          value="theme"
        >
          Theme
        </helix-drilldown-item>
        <helix-drilldown-item
          slot="page"
          value="density"
        >
          Density
        </helix-drilldown-item>
      </helix-drilldown-item>
      <helix-drilldown-item value="editor">
        Editor
        <helix-drilldown-item
          slot="page"
          value="tabs"
        >
          Tab size
        </helix-drilldown-item>
        <helix-drilldown-item
          slot="page"
          value="wrap"
        >
          Word wrap
        </helix-drilldown-item>
      </helix-drilldown-item>
      <helix-drilldown-item value="about">About</helix-drilldown-item>
    </helix-drilldown>
  )
}
