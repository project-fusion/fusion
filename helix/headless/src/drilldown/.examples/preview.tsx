import './preview.css'

export function Example() {
  return (
    <helix-headless-drilldown
      className="panel"
      label="Settings"
    >
      {' '}
      <helix-headless-drilldown-item value="appearance">
        {' '}
        Appearance{' '}
        <helix-headless-drilldown-item
          slot="page"
          value="theme"
        >
          Theme
        </helix-headless-drilldown-item>{' '}
        <helix-headless-drilldown-item
          slot="page"
          value="density"
        >
          Density
        </helix-headless-drilldown-item>{' '}
      </helix-headless-drilldown-item>{' '}
      <helix-headless-drilldown-item value="editor">
        {' '}
        Editor{' '}
        <helix-headless-drilldown-item
          slot="page"
          value="tabs"
        >
          Tab size
        </helix-headless-drilldown-item>{' '}
        <helix-headless-drilldown-item
          slot="page"
          value="wrap"
        >
          Word wrap
        </helix-headless-drilldown-item>{' '}
      </helix-headless-drilldown-item>{' '}
      <helix-headless-drilldown-item value="about">About</helix-headless-drilldown-item>{' '}
    </helix-headless-drilldown>
  )
}
