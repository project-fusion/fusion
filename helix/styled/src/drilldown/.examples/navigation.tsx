import './navigation.css'

export function Example() {
  return (
    <helix-drilldown
      className="panel"
      label="Site"
      navigation
    >
      <helix-drilldown-item value="docs">
        Documentation
        <helix-drilldown-item
          href="#start"
          slot="page"
          value="start"
        >
          Getting started
        </helix-drilldown-item>
        <helix-drilldown-item
          href="#theming"
          slot="page"
          value="theming"
        >
          Theming
        </helix-drilldown-item>
      </helix-drilldown-item>
      <helix-drilldown-item
        href="#blog"
        value="blog"
      >
        Blog
      </helix-drilldown-item>
      <helix-drilldown-item
        href="#pricing"
        value="pricing"
      >
        Pricing
      </helix-drilldown-item>
    </helix-drilldown>
  )
}
